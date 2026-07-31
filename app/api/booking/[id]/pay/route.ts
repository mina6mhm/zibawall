// app/api/booking/[id]/pay/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { requestZarinpalPayment } from '@/lib/zarinpal';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'نوبتی یافت نشد' }, { status: 404 });
    }

    // فقط خود مشتری که نوبت با شماره‌اش ثبت و لینک شده اجازه‌ی پرداخت داره
    if (booking.customerId !== decoded.userId) {
      return NextResponse.json({ error: 'شما اجازه‌ی پرداخت این نوبت را ندارید' }, { status: 403 });
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'این نوبت قبلاً پرداخت یا لغو شده است' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const callbackUrl = `${baseUrl}/api/booking/verify?bookingId=${booking.id}`;

    const { authority, paymentUrl } = await requestZarinpalPayment({
      amountToman: booking.totalAmount,
      description: `بیعانه نوبت در ${booking.salon.name}`,
      callbackUrl,
      mobile: booking.customerPhone,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { authority },
    });
    

    return NextResponse.json({ paymentUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Error starting booking payment:', error);
    return NextResponse.json({ error: error.message || 'خطا در اتصال به درگاه پرداخت' }, { status: 500 });
  }
}