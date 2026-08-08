// app/api/booking-services/route.ts
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

// GET: لیست خدمات نوبت‌دهی سالن
export async function GET() {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const services = await prisma.bookingService.findMany({
    where: { salonId: salon.id },
    include: { staffMembers: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ services });
}

// POST: افزودن خدمت جدید
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const body = await req.json();
  const { name, durationMin, price, depositAmount } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'نام خدمات الزامی است' }, { status: 400 });
  if (!durationMin || durationMin < 1) return NextResponse.json({ error: 'مدت زمان نامعتبر است' }, { status: 400 });
  // قیمت اختیاریه — اگه نبود 0 ذخیره می‌شه

  const service = await prisma.bookingService.create({
    data: {
      salonId: salon.id,
      name: name.trim(),
      durationMin: Number(durationMin),
      price: Number(price),
      depositAmount: depositAmount != null ? Number(depositAmount) : null,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}