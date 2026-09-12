// app/api/booking-services/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';

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

  const resultingDeposit = depositAmount !== undefined ? Number(depositAmount) || 0 : (existing.depositAmount ?? 0);
  if (resultingDeposit > 0 && !salon.cardNumber) {
    return NextResponse.json(
      { error: 'برای دریافت بیعانه، ابتدا باید شماره کارت سالن را وارد کنید.' },
      { status: 400 }
    );
  }

  const updated = await prisma.bookingService.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: String(name).trim() }),
      ...(durationMin !== undefined && { durationMin: Number(durationMin) }),
      ...(price !== undefined && { price: Number(price) }),
      ...(depositAmount !== undefined && { depositAmount: depositAmount ? Number(depositAmount) : null }),
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