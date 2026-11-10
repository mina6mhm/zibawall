// app/api/booking-group/[id]/pay/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { requestZarinpalPayment } from '@/lib/zarinpal';
import { checkGroupSlotsStillAvailable } from '@/lib/bookingSchedule';
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

    const group = await prisma.bookingGroup.findUnique({
      where: { id },
      include: { salon: { select: { name: true } }, bookings: true },
    });

    if (!group) return NextResponse.json({ error: 'رزروی یافت نشد' }, { status: 404 });
    if (group.customerId !== auth.userId) {
      return NextResponse.json({ error: 'شما اجازه‌ی پرداخت این رزرو را ندارید' }, { status: 403 });
    }
    if (group.paymentStatus !== 'PENDING') {
      return NextResponse.json({ error: 'این رزرو قبلاً پرداخت یا لغو شده است' }, { status: 400 });
    }

    if (!Number.isInteger(group.totalAmount) || group.totalAmount <= 0) {
      return NextResponse.json({ error: 'مبلغ رزرو نامعتبر است' }, { status: 400 });
    }

    // جلوگیری از دوبار کلیک: هر درخواست یک authority جدید می‌سازد و روی رکورد می‌نویسد
    if (!acquirePaymentLock(`group:${group.id}`)) {
      return NextResponse.json(
        { error: 'درخواست پرداخت در حال پردازش است. چند ثانیه صبر کنید' },
        { status: 429 }
      );
    }
    lockKey = `group:${group.id}`;

    // قبل از فرستادن کاربر به درگاه چک کن که هولد منقضی نشده و ساعت‌ها هنوز آزادند؛
    // وگرنه کاربر پول می‌دهد و بعد از پرداخت «نوبت در دسترس نبود» می‌گیرد (و باید استرداد شود)
    if (group.expiresAt && group.expiresAt.getTime() <= Date.now()) {
      return NextResponse.json(
        { error: 'مهلت پرداخت این رزرو به پایان رسیده است. لطفاً دوباره رزرو کنید' },
        { status: 409 }
      );
    }
    const availability = await checkGroupSlotsStillAvailable(group.bookings, prisma);
    if (!availability.ok) {
      return NextResponse.json({ error: availability.error }, { status: 409 });
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/+$/, '');
    const callbackUrl = `${baseUrl}/api/booking-group/verify?groupId=${group.id}`;

    const { authority, paymentUrl } = await requestZarinpalPayment({
      amountToman: group.totalAmount,
      description: `رزرو نوبت در ${group.salon.name}`,
      callbackUrl,
      mobile: group.customerPhone,
    });

    // فقط اگر هنوز PENDING است authority را بنویس (پرداخت هم‌زمانِ قبلی را خراب نکند)
    const updated = await prisma.bookingGroup.updateMany({
      where: { id: group.id, paymentStatus: 'PENDING' },
      data: { authority },
    });
    if (updated.count === 0) {
      return NextResponse.json({ error: 'این رزرو قبلاً پرداخت یا لغو شده است' }, { status: 400 });
    }

    succeeded = true; // قفل تا پایان TTL می‌ماند تا کلیک تکراری authority دوم نسازد
    return NextResponse.json({ paymentUrl }, { status: 200 });
  } catch (error) {
    console.error('Error starting group payment:', error);
    // پیام داخلی (error.message) به کلاینت نشت نمی‌کند
    return NextResponse.json(
      { error: 'خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید' },
      { status: 502 }
    );
  } finally {
    if (lockKey && !succeeded) releasePaymentLock(lockKey);
  }
}
