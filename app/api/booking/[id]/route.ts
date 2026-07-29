// app/api/booking/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone } = body;

    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.salonId !== salon.id) {
      return NextResponse.json({ error: 'نوبت یافت نشد.' }, { status: 404 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ booking: updated });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'خطا در لغو نوبت' }, { status: 500 });
  }
}