// app/api/staff-overrides/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';
import { parseClosedRanges } from '@/lib/bookingSchedule';
import { rateLimit } from '@/lib/rateLimit';
import { isHHMM, isIsoDate, parseJsonBody, tehranDayOffset, tooManyRequests } from '@/lib/http';

// بدون سقف، تاریخچه‌ی همه‌ی روزهای همه‌ی پرسنل با هر بار باز شدن صفحه کشیده می‌شد.
// پیش‌فرض: از ۳۱ روز پیش تا آینده؛ با ?from=YYYY-MM-DD&to=YYYY-MM-DD قابل تغییر است.
const DEFAULT_LOOKBACK_DAYS = 31;
const MAX_ROWS_ONE_STAFF = 500;
const MAX_ROWS_ALL_STAFF = 2000;
const MAX_NOTE_LENGTH = 300;

// GET: دریافت override های ثبت‌شده — یا برای یک پرسنل خاص (staffId) یا همه‌ی پرسنل سالن
export async function GET(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get('staffId');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');

  if ((fromParam && !isIsoDate(fromParam)) || (toParam && !isIsoDate(toParam))) {
    return NextResponse.json({ error: 'from/to باید به شکل YYYY-MM-DD باشند' }, { status: 400 });
  }
  const dateFilter = {
    gte: fromParam ?? tehranDayOffset(-DEFAULT_LOOKBACK_DAYS),
    ...(toParam ? { lte: toParam } : {}),
  };

  if (staffId) {
    const staffMember = await prisma.staff.findFirst({
      where: { id: staffId, salonId: salon.id },
      select: { id: true },
    });
    if (!staffMember) return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

    const overrides = await prisma.staffScheduleOverride.findMany({
      where: { staffId, date: dateFilter },
      orderBy: { date: 'asc' },
      take: MAX_ROWS_ONE_STAFF,
    });

    return NextResponse.json({ overrides });
  }

  // یک کوئری با فیلتر رابطه (به‌جای دو کوئری: اول لیست پرسنل، بعد IN روی همه‌ی idها)
  const overrides = await prisma.staffScheduleOverride.findMany({
    where: { staff: { salonId: salon.id }, date: dateFilter },
    orderBy: { date: 'asc' },
    take: MAX_ROWS_ALL_STAFF,
  });

  return NextResponse.json({ overrides });
}

// POST: ثبت یا بروزرسانی override ساعت کاری پرسنل در یک تاریخ خاص
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const limit = await rateLimit(`staff-override:${salon.id}`, 60, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { staffId, date, isDayOff, start, end, note, closedRanges } = parsed.body;

  if (typeof staffId !== 'string' || !staffId || !isIsoDate(date)) {
    return NextResponse.json({ error: 'staffId و date (YYYY-MM-DD) الزامی است' }, { status: 400 });
  }
  if ((start && !isHHMM(start)) || (end && !isHHMM(end))) {
    return NextResponse.json({ error: 'ساعت شروع/پایان نامعتبر است' }, { status: 400 });
  }
  if (note != null && (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH)) {
    return NextResponse.json({ error: 'توضیح نامعتبر یا بیش از حد طولانی است' }, { status: 400 });
  }

  const staffMember = await prisma.staff.findFirst({
    where: { id: staffId, salonId: salon.id },
    select: { id: true },
  });
  if (!staffMember) return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

  // بازه‌های تعطیلیِ فقط-همون-ساعت — وقتی پرسنل کلاً مرخصی نیست
  const cleanClosedRanges = isDayOff ? [] : parseClosedRanges(closedRanges);
  const data = {
    isDayOff: !!isDayOff,
    start: isDayOff ? null : ((start as string) || null),
    end: isDayOff ? null : ((end as string) || null),
    note: (note as string | null | undefined) || null,
    closedRanges: cleanClosedRanges,
  };

  const override = await prisma.staffScheduleOverride.upsert({
    where: { staffId_date: { staffId, date } },
    create: { staffId, date, ...data },
    update: data,
  });

  return NextResponse.json({ success: true, override });
}

// DELETE: حذف override (بازگشت به ساعت کاری پیش‌فرض سالن)
export async function DELETE(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { staffId, date } = parsed.body;

  if (typeof staffId !== 'string' || !staffId || !isIsoDate(date)) {
    return NextResponse.json({ error: 'staffId و date (YYYY-MM-DD) الزامی است' }, { status: 400 });
  }

  // قبلاً مالکیت چک نمی‌شد: هر سالن‌داری با حدس staffId می‌توانست override پرسنل «سالن دیگر» را پاک کند
  const staffMember = await prisma.staff.findFirst({
    where: { id: staffId, salonId: salon.id },
    select: { id: true },
  });
  if (!staffMember) return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

  await prisma.staffScheduleOverride.deleteMany({
    where: { staffId, date },
  });

  return NextResponse.json({ success: true });
}
