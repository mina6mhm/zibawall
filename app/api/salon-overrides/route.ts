// app/api/salon-overrides/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';
import { parseClosedRanges } from '@/lib/bookingSchedule';
import { rateLimit } from '@/lib/rateLimit';
import { isHHMM, isIsoDate, parseJsonBody, tehranDayOffset, tooManyRequests } from '@/lib/http';

// بدون سقف، تاریخچه‌ی همه‌ی روزهای سالن (سال‌ها override) با هر بار باز شدن صفحه کشیده می‌شد.
// پیش‌فرض: از ۳۱ روز پیش تا آینده؛ با ?from=YYYY-MM-DD&to=YYYY-MM-DD قابل تغییر است.
const DEFAULT_LOOKBACK_DAYS = 31;
const MAX_ROWS = 500;
const MAX_NOTE_LENGTH = 300;

// GET: دریافت override های ثبت‌شده‌ی سالنِ لاگین‌کرده (در بازه‌ی تاریخ و با سقف تعداد)
export async function GET(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  if ((fromParam && !isIsoDate(fromParam)) || (toParam && !isIsoDate(toParam))) {
    return NextResponse.json({ error: 'from/to باید به شکل YYYY-MM-DD باشند' }, { status: 400 });
  }
  const from = fromParam ?? tehranDayOffset(-DEFAULT_LOOKBACK_DAYS);

  const overrides = await prisma.salonScheduleOverride.findMany({
    where: {
      salonId: salon.id,
      date: { gte: from, ...(toParam ? { lte: toParam } : {}) },
    },
    orderBy: { date: 'asc' },
    take: MAX_ROWS,
  });

  return NextResponse.json({ overrides });
}

// POST: ثبت یا بروزرسانی وضعیت یک روز خاص
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const limit = await rateLimit(`salon-override:${salon.id}`, 60, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { date, isClosed, start, end, note, closedRanges } = parsed.body;

  if (!isIsoDate(date)) {
    return NextResponse.json({ error: 'date الزامی است و باید به شکل YYYY-MM-DD باشد' }, { status: 400 });
  }
  if ((start && !isHHMM(start)) || (end && !isHHMM(end))) {
    return NextResponse.json({ error: 'ساعت شروع/پایان نامعتبر است' }, { status: 400 });
  }
  if (note != null && (typeof note !== 'string' || note.length > MAX_NOTE_LENGTH)) {
    return NextResponse.json({ error: 'توضیح نامعتبر یا بیش از حد طولانی است' }, { status: 400 });
  }

  // بازه‌های تعطیلیِ فقط-همون-ساعت — وقتی سالن کلاً تعطیل نیست
  const cleanClosedRanges = isClosed ? [] : parseClosedRanges(closedRanges);
  const data = {
    isClosed: !!isClosed,
    start: isClosed ? null : ((start as string) || null),
    end: isClosed ? null : ((end as string) || null),
    note: (note as string | null | undefined) || null,
    closedRanges: cleanClosedRanges,
  };

  const override = await prisma.salonScheduleOverride.upsert({
    where: { salonId_date: { salonId: salon.id, date } },
    create: { salonId: salon.id, date, ...data },
    update: data,
  });

  return NextResponse.json({ success: true, override });
}

// DELETE: حذف override (بازگشت به برنامه‌ی هفتگی عادی سالن)
export async function DELETE(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { date } = parsed.body;

  if (!isIsoDate(date)) {
    return NextResponse.json({ error: 'date الزامی است و باید به شکل YYYY-MM-DD باشد' }, { status: 400 });
  }

  await prisma.salonScheduleOverride.deleteMany({
    where: { salonId: salon.id, date },
  });

  return NextResponse.json({ success: true });
}
