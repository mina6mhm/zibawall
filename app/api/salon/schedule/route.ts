// app/api/salon/schedule/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';

// GET: دریافت برنامه هفتگی سالن
export async function GET() {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const schedule = await prisma.salonSchedule.findUnique({
    where: { salonId: salon.id },
  });

  if (!schedule) return NextResponse.json({ weeklySchedule: null, gridMinutes: 30 });

  return NextResponse.json({
    weeklySchedule: schedule.weeklySchedule,
    gridMinutes: schedule.gridMinutes,
  });
}

// POST: ذخیره یا بروزرسانی برنامه هفتگی
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const body = await req.json();
  const { weeklySchedule, gridMinutes } = body;

  if (!weeklySchedule) return NextResponse.json({ error: 'weeklySchedule الزامی است' }, { status: 400 });
  if (![15, 30, 60].includes(Number(gridMinutes)))
    return NextResponse.json({ error: 'gridMinutes باید ۱۵، ۳۰ یا ۶۰ باشد' }, { status: 400 });

  const schedule = await prisma.salonSchedule.upsert({
    where: { salonId: salon.id },
    create: {
      salonId: salon.id,
      weeklySchedule,
      gridMinutes: Number(gridMinutes),
    },
    update: {
      weeklySchedule,
      gridMinutes: Number(gridMinutes),
    },
  });

  return NextResponse.json({ success: true, schedule });
}