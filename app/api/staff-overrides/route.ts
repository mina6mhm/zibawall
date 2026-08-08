// app/api/staff-overrides/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

async function getSalonFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return await prisma.salon.findUnique({ where: { userId: decoded.userId } });
  } catch {
    return null;
  }
}

// POST: ثبت یا بروزرسانی override ساعت کاری پرسنل در یک تاریخ خاص
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const body = await req.json();
  const { staffId, date, isDayOff, start, end, note } = body;

  if (!staffId || !date)
    return NextResponse.json({ error: 'staffId و date الزامی است' }, { status: 400 });

  // بررسی تعلق پرسنل به همین سالن
  const staffMember = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staffMember || staffMember.salonId !== salon.id)
    return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

  const override = await prisma.staffScheduleOverride.upsert({
    where: { staffId_date: { staffId, date } },
    create: {
      staffId,
      date,
      isDayOff: !!isDayOff,
      start: isDayOff ? null : (start || null),
      end: isDayOff ? null : (end || null),
      note: note || null,
    },
    update: {
      isDayOff: !!isDayOff,
      start: isDayOff ? null : (start || null),
      end: isDayOff ? null : (end || null),
      note: note || null,
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