// app/api/staff-overrides/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';
import { parseClosedRanges } from '@/lib/bookingSchedule';

// GET: دریافت override های ثبت‌شده — یا برای یک پرسنل خاص (staffId) یا همه‌ی پرسنل سالن
export async function GET(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const staffId = searchParams.get('staffId');

  if (staffId) {
    const staffMember = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staffMember || staffMember.salonId !== salon.id)
      return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

    const overrides = await prisma.staffScheduleOverride.findMany({
      where: { staffId },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({ overrides });
  }

  const salonStaff = await prisma.staff.findMany({
    where: { salonId: salon.id },
    select: { id: true },
  });

  const overrides = await prisma.staffScheduleOverride.findMany({
    where: { staffId: { in: salonStaff.map((s) => s.id) } },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ overrides });
}

// POST: ثبت یا بروزرسانی override ساعت کاری پرسنل در یک تاریخ خاص
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const body = await req.json();
  const { staffId, date, isDayOff, start, end, note, closedRanges } = body;

  if (!staffId || !date)
    return NextResponse.json({ error: 'staffId و date الزامی است' }, { status: 400 });

  const staffMember = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staffMember || staffMember.salonId !== salon.id)
    return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

  // بازه‌های تعطیلیِ فقط-همون-ساعت — وقتی پرسنل کلاً مرخصی نیست
  const cleanClosedRanges = isDayOff ? [] : parseClosedRanges(closedRanges);

  const override = await prisma.staffScheduleOverride.upsert({
    where: { staffId_date: { staffId, date } },
    create: {
      staffId,
      date,
      isDayOff: !!isDayOff,
      start: isDayOff ? null : (start || null),
      end: isDayOff ? null : (end || null),
      note: note || null,
      closedRanges: cleanClosedRanges,
    },
    update: {
      isDayOff: !!isDayOff,
      start: isDayOff ? null : (start || null),
      end: isDayOff ? null : (end || null),
      note: note || null,
      closedRanges: cleanClosedRanges,
    },
  });

  return NextResponse.json({ success: true, override });
}

// DELETE: حذف override (بازگشت به ساعت کاری پیش‌فرض سالن)
export async function DELETE(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { staffId, date } = await req.json();

  await prisma.staffScheduleOverride.deleteMany({
    where: { staffId, date },
  });

  return NextResponse.json({ success: true });
}