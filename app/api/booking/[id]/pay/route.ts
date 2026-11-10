// app/api/booking/[id]/pay/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { requestZarinpalPayment } from '@/lib/zarinpal';
import { checkBookingSlotStillAvailable } from '@/lib/bookingSchedule';
import { acquirePaymentLock, releasePaymentLock } from '@/lib/paymentLock';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let lockKey: string | null = null;
  let succeeded = false;

  try {
    const { id } = await params;

    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!booking) {
      return NextResponse.json({ error: 'نوبتی یافت نشد' }, { status: 404 });
    }

    // فقط خود مشتری که نوبت با شماره‌اش ثبت و لینک شده اجازه‌ی پرداخت داره
    if (booking.customerId !== auth.userId) {
      return NextResponse.json({ error: 'شما اجازه‌ی پرداخت این نوبت را ندارید' }, { status: 403 });
    }

    if (booking.status !== 'PENDING_PAYMENT') {
      return NextResponse.json({ error: 'این نوبت قبلاً پرداخت یا لغو شده است' }, { status: 400 });
    }

    if (!Number.isInteger(booking.totalAmount) || booking.totalAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ نوبت نامعتبر است' }, { status: 400 });
    }

    if (!acquirePaymentLock(`booking:${booking.id}`)) {
      return NextResponse.json(
        { error: 'درخواست پرداخت در حال پردازش است. چند ثانیه صبر کنید' },
        { status: 429 }
      );
    }
    lockKey = `booking:${booking.id}`;

    // قبل از فرستادن کاربر به درگاه چک کن که ساعت هنوز آزاد است؛ وگرنه کاربر
    // پول می‌دهد و بعد از پرداخت «نوبت در دسترس نبود» می‌گیرد (و باید استرداد شود)
    const availability = await checkBookingSlotStillAvailable(booking, prisma);
    if (!availability.ok) {
      return NextResponse.json(
        { error: 'این ساعت دیگر در دسترس نیست. لطفاً زمان دیگری انتخاب کنید' },
        { status: 409 }
      );
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/+$/, '');
    const callbackUrl = `${baseUrl}/api/booking/verify?bookingId=${booking.id}`;

    const { authority, paymentUrl } = await requestZarinpalPayment({
      amountToman: booking.totalAmount,
      description: `بیعانه نوبت در ${booking.salon.name}`,
      callbackUrl,
      mobile: booking.customerPhone,
    });

    // فقط اگر هنوز PENDING_PAYMENT است authority را بنویس (پرداخت/لغو هم‌زمان را خراب نکند)
    const updated = await prisma.booking.updateMany({
      where: { id: booking.id, status: 'PENDING_PAYMENT' },
      data: { authority },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'این نوبت قبلاً پرداخت یا لغو شده است' }, { status: 400 });
    }

    succeeded = true; // قفل تا پایان TTL می‌ماند تا کلیک تکراری authority دوم نسازد
    return NextResponse.json({ paymentUrl }, { status: 200 });
  } catch (error) {
    console.error('Error starting booking payment:', error);
    // پیام داخلی (error.message) دیگر به کلاینت نشت نمی‌کند
    return NextResponse.json(
      { error: 'خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید' },
      { status: 502 }
    );
  } finally {
    if (lockKey && !succeeded) releasePaymentLock(lockKey);
  }
}