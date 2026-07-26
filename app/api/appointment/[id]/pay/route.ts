//app/api/appointment/[id]/pay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requestZarinpalPayment } from '@/lib/zarinpal';

const prisma = new PrismaClient();

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone } = body;
    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { salon: { select: { name: true } } },
    });
    if (!appointment) return NextResponse.json({ error: 'نوبت یافت نشد.' }, { status: 404 });
    if (appointment.customerId !== user.id) {
      return NextResponse.json({ error: 'دسترسی ندارید.' }, { status: 403 });
    }
    if (appointment.status !== 'AWAITING_PAYMENT') {
      return NextResponse.json({ error: 'این نوبت آماده پرداخت نیست.' }, { status: 400 });
    }

    const origin = req.nextUrl.origin;
    const callbackUrl = `${origin}/api/appointment/verify?appointmentId=${id}`;

    const { authority, paymentUrl } = await requestZarinpalPayment({
      amountToman: appointment.depositAmount,
      description: `بیعانه نوبت در ${appointment.salon.name}`,
      callbackUrl,
      mobile: user.phone || undefined,
    });

    await prisma.appointment.update({
      where: { id },
      data: { authority },
    });

    return NextResponse.json({ paymentUrl });
  } catch (error: any) {
    console.error('Error requesting payment:', error);
    return NextResponse.json({ error: error.message || 'خطا در اتصال به درگاه پرداخت' }, { status: 500 });
  }
}
