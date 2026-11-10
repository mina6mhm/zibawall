// app/api/salon/pin/verify/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { verifyZarinpalPayment } from '@/lib/zarinpal';

export const dynamic = 'force-dynamic';

const PIN_DURATION_DAYS = 30;
const PIN_DURATION_MS = PIN_DURATION_DAYS * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const paymentId = searchParams.get('paymentId');

  // پشت پروکسی origin درخواست ممکن است آدرس داخلی باشد
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/+$/, '');

  // برگشت از زرین‌پال روی اپ‌های نیتیو داخل مرورگرِ سیستم اتفاق می‌افتد (کوکی لاگین اپ آنجا نیست)
  // → صفحه‌ی عمومی /payment/result؛ در حالت وب (کوکی معتبر) → صفحه‌ی بیزینس
  const auth = await getAuthUser();
  const hasValidSession = !('error' in auth);

  const redirectTo = (resultStatus: 'success' | 'failed') =>
    hasValidSession
      ? NextResponse.redirect(`${baseUrl}/profile/business/overview?pinResult=${resultStatus}`)
      : NextResponse.redirect(`${baseUrl}/payment/result?status=${resultStatus}`);

  if (!paymentId || !authority) return redirectTo('failed');

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.authority !== authority) return redirectTo('failed');

  // idempotent: اگر قبلاً روی این پرداخت verify موفق انجام شده، دوباره روزها اضافه نشود
  if (payment.status === 'SUCCESS') return redirectTo('success');

  // فقط اگر هنوز SUCCESS نشده FAILED می‌نویسیم (قبلاً Status=NOK روی پرداخت موفق هم FAILED می‌نوشت)
  const markFailedUnlessPaid = async (): Promise<'success' | 'failed'> => {
    const res = await prisma.payment.updateMany({
      where: { id: payment.id, status: { not: 'SUCCESS' } },
      data: { status: 'FAILED' },
    });
    return res.count > 0 ? 'failed' : 'success';
  };

  if (status !== 'OK') {
    return redirectTo(await markFailedUnlessPaid());
  }

  let result: Awaited<ReturnType<typeof verifyZarinpalPayment>>;
  try {
    result = await verifyZarinpalPayment({ amountToman: payment.amount, authority });
  } catch (error) {
    // خطای شبکه/timeout: وضعیت نامعلوم است؛ FAILED نمی‌کنیم تا لینک دوباره قابل verify باشد
    console.error('Error verifying salon pin payment:', error);
    return redirectTo('failed');
  }

  if (!result.success) {
    return redirectTo(await markFailedUnlessPaid());
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // «ادعای» اتمیک پرداخت: فقط یک callback (از چند callback هم‌زمان/تکراری) برنده می‌شود.
        // قبلاً دو callback هم‌زمان هر دو شرط SUCCESS نبودن را رد می‌کردند و ۳۰ روز دوبار اضافه می‌شد.
        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: { not: 'SUCCESS' } },
          data: { status: 'SUCCESS', refId: String(result.refId) },
        });
        if (claimed.count === 0) return; // callback دیگری قبلاً روزها را اضافه کرده

        // قفل ردیف سالن: دو پرداخت پینِ هم‌زمان برای یک سالن، تمدید همدیگر را گم نکنند
        await tx.$queryRaw`SELECT id FROM "Salon" WHERE id = ${payment.salonId} FOR UPDATE`;

        const salon = await tx.salon.findUnique({ where: { id: payment.salonId } });
        if (!salon) return;

        const now = new Date();
        // اگر سالن از قبل پین بوده و هنوز منقضی نشده، ۳۰ روز به تاریخ انقضای
        // فعلی اضافه می‌شود (تمدید)؛ در غیر این صورت پین از همین لحظه شروع می‌شود.
        const currentExpiry =
          salon.pinnedUntil && new Date(salon.pinnedUntil) > now ? new Date(salon.pinnedUntil) : now;
        const newExpiry = new Date(currentExpiry.getTime() + PIN_DURATION_MS);

        await tx.salon.update({
          where: { id: salon.id },
          data: { pinnedUntil: newExpiry, pinnedAt: now },
        });
      },
      { maxWait: 10_000, timeout: 15_000 }
    );

    return redirectTo('success');
  } catch (error) {
    // پول تایید شده ولی ثبت در دیتابیس شکست خورد → باید دستی پیگیری شود
    console.error('PAYMENT_VERIFIED_BUT_PIN_NOT_APPLIED', {
      paymentId: payment.id,
      authority,
      refId: result.refId,
      error,
    });
    return redirectTo('failed');
  }
}
