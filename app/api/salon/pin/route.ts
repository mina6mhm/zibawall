// app/api/salon/pin/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { requestZarinpalPayment } from '@/lib/zarinpal';
import { getSalonForUserId } from '@/lib/salonAccess';
import { rateLimit } from '@/lib/rateLimit';
import { acquirePaymentLock, releasePaymentLock } from '@/lib/paymentLock';

// هزینه و مدت پین کردن سالن — این عدد فقط داخل درخواست به زرین‌پال استفاده می‌شود
// و در پاسخ این API یا هر جای دیگر رابط کاربری خودمان نمایش داده نمی‌شود؛
// مبلغ را فقط خودِ درگاه زرین‌پال به کاربر نشان می‌دهد.
const PIN_PRICE_TOMAN = 5_000_000;
const PIN_DURATION_DAYS = 30;
const PIN_PLAN_ID = 'salon-pin-30d';

// پرداخت‌های ناتمامِ قدیمی‌تر از این مدت پاک‌سازی می‌شوند تا جدول با کلیک‌های رهاشده پر نشود
const STALE_PENDING_MS = 24 * 60 * 60 * 1000;

export async function POST(req: Request) {
  let lockKey: string | null = null;
  let succeeded = false;

  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // هر کلیک یک رکورد Payment و یک درخواست به زرین‌پال می‌سازد؛ بدون محدودیت، قابل سوءاستفاده است
    const rl = await rateLimit(`pin:${auth.userId}`, 5, 10 * 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'درخواست‌های پیاپی زیاد است. کمی بعد دوباره تلاش کنید' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
      );
    }

    // صاحب اصلی سالن و همچنین مدیرهای اضافه‌شده (SalonManager) اجازه‌ی پین کردن دارند
    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const salon = await getSalonForUserId(user.id);
    if (!salon) {
      return NextResponse.json({ error: 'شما به هیچ سالنی دسترسی ندارید' }, { status: 403 });
    }

    if (salon.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'برای پین کردن، سالن شما باید ابتدا توسط ادمین تایید شده باشد' },
        { status: 400 }
      );
    }

    // دوبار کلیک: authority دوم، اولی را بی‌اعتبار می‌کرد و پرداخت با اولی «ناموفق» دیده می‌شد
    if (!(await acquirePaymentLock(`pin:${salon.id}`))) {
      return NextResponse.json(
        { error: 'درخواست پرداخت در حال پردازش است. چند ثانیه صبر کنید' },
        { status: 429 }
      );
    }
    lockKey = `pin:${salon.id}`;

    // پاک‌سازی ارزان پرداخت‌های PENDING رهاشده‌ی همین سالن (بدون authority یا قدیمی)
    await prisma.payment
      .deleteMany({
        where: {
          salonId: salon.id,
          planId: PIN_PLAN_ID,
          status: 'PENDING',
          createdAt: { lt: new Date(Date.now() - STALE_PENDING_MS) },
        },
      })
      .catch(() => {});

    const payment = await prisma.payment.create({
      data: {
        amount: PIN_PRICE_TOMAN,
        status: 'PENDING',
        planId: PIN_PLAN_ID,
        salonId: salon.id,
      },
    });

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/+$/, '');
    const callbackUrl = `${baseUrl}/api/salon/pin/verify?paymentId=${payment.id}`;

    const { authority, paymentUrl } = await requestZarinpalPayment({
      amountToman: PIN_PRICE_TOMAN,
      description: `پین کردن سالن «${salon.name}» به مدت ${PIN_DURATION_DAYS} روز`,
      callbackUrl,
      mobile: user.phone ?? undefined,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { authority },
    });

    succeeded = true; // قفل تا پایان TTL می‌ماند
    return NextResponse.json({ paymentUrl }, { status: 200 });
  } catch (error) {
    console.error('Error starting salon pin payment:', error);
    // پیام داخلی (error.message) به کلاینت نشت نمی‌کند
    return NextResponse.json(
      { error: 'خطا در اتصال به درگاه پرداخت. لطفاً دوباره تلاش کنید' },
      { status: 502 }
    );
  } finally {
    if (lockKey && !succeeded) await releasePaymentLock(lockKey);
  }
}
