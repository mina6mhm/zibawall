// app/api/booking-services/[id]/route.ts
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

// PUT: ویرایش خدمت
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.bookingService.findUnique({ where: { id } });
  if (!existing || existing.salonId !== salon.id)
    return NextResponse.json({ error: 'خدمتی یافت نشد' }, { status: 404 });

  const body = await req.json();
  const { name, durationMin, price, depositAmount, isActive } = body;

  const updated = await prisma.bookingService.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(durationMin !== undefined && { durationMin: Number(durationMin) }),
      ...(price !== undefined && { price: Number(price) }),
      ...(depositAmount !== undefined && { depositAmount: depositAmount != null ? Number(depositAmount) : null }),
      ...(isActive !== undefined && { isActive: Boolean(isActive) }),
    },
  });

  return NextResponse.json({ service: updated });
}

// DELETE: حذف خدمت
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.bookingService.findUnique({ where: { id } });
  if (!existing || existing.salonId !== salon.id)
    return NextResponse.json({ error: 'خدمتی یافت نشد' }, { status: 404 });

  await prisma.bookingService.delete({ where: { id } });
  return NextResponse.json({ success: true });
}