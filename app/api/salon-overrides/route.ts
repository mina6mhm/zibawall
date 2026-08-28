// app/api/salon-overrides/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';

// GET: دریافت همه‌ی override های ثبت‌شده برای سالنِ لاگین‌کرده
export async function GET() {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const overrides = await prisma.salonScheduleOverride.findMany({
    where: { salonId: salon.id },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json({ overrides });
}

// POST: ثبت یا بروزرسانی وضعیت یک روز خاص
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const body = await req.json();
  const { date, isClosed, start, end, note } = body;

  if (!date) return NextResponse.json({ error: 'date الزامی است' }, { status: 400 });

  const override = await prisma.salonScheduleOverride.upsert({
    where: { salonId_date: { salonId: salon.id, date } },
    create: {
      salonId: salon.id,
      date,
      isClosed: !!isClosed,
      start: isClosed ? null : (start || null),
      end: isClosed ? null : (end || null),
      note: note || null,
    },
    update: {
      isClosed: !!isClosed,
      start: isClosed ? null : (start || null),
      end: isClosed ? null : (end || null),
      note: note || null,
    },
  });

  return NextResponse.json({ success: true, override });
}

// DELETE: حذف override (بازگشت به برنامه‌ی هفتگی عادی سالن)
export async function DELETE(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { date } = await req.json();

  await prisma.salonScheduleOverride.deleteMany({
    where: { salonId: salon.id, date },
  });

  return NextResponse.json({ success: true });
}