// app/api/booking-services/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';

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
  const { name, durationMin, price } = body;

  if (!name?.trim()) return NextResponse.json({ error: 'نام خدمات الزامی است' }, { status: 400 });
  if (!durationMin || durationMin < 1) return NextResponse.json({ error: 'مدت زمان نامعتبر است' }, { status: 400 });

  const service = await prisma.bookingService.create({
    data: {
      salonId: salon.id,
      name: name.trim(),
      durationMin: Number(durationMin),
      price: price ? Number(price) : 0,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}