// app/api/salon/pin/verify/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { verifyZarinpalPayment } from '@/lib/zarinpal';

const PIN_DURATION_DAYS = 30;
const PIN_DURATION_MS = PIN_DURATION_DAYS * 24 * 60 * 60 * 1000;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const paymentId = searchParams.get('paymentId');

  const baseUrl = new URL(req.url).origin;

  // این درخواست (برگشت از زرین‌پال) روی اپ‌های نیتیو داخل مرورگرِ سیستم اتفاق
  // می‌افتد نه WebView خودِ اپ (به lib/openPaymentUrl.ts نگاه کنید)، پس کوکی
  // لاگینِ اپ آنجا وجود ندارد. اگر همین‌جا کوکی معتبر داشتیم (حالت وب)، مستقیم
  // به صفحه‌ی محافظت‌شده برمی‌گردیم؛ در غیر این صورت (حالت اپ نیتیو) به
  // صفحه‌ی عمومی /payment/result که نیازی به لاگین ندارد.
  const hasValidSession = await (async () => {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('token')?.value;
      if (!token) return false;
      jwt.verify(token, process.env.JWT_SECRET!);
      return true;
    } catch {
      return false;
    }
  })();

  const redirectTo = (resultStatus: 'success' | 'failed') =>
    hasValidSession
      ? NextResponse.redirect(`${baseUrl}/profile/business/overview?pinResult=${resultStatus}`)
      : NextResponse.redirect(`${baseUrl}/payment/result?status=${resultStatus}`);

  if (!paymentId || !authority) return redirectTo('failed');

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.authority !== authority) return redirectTo('failed');

  // idempotent: اگر قبلاً روی این پرداخت verify موفق انجام شده، دوباره روزها اضافه نشود
  if (payment.status === 'SUCCESS') return redirectTo('success');

  if (status !== 'OK') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    return redirectTo('failed');
  }

  try {
    const result = await verifyZarinpalPayment({ amountToman: payment.amount, authority });

    if (result.success) {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCESS', refId: String(result.refId) },
        });

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
      });

      return redirectTo('success');
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    return redirectTo('failed');
  } catch (error) {
    console.error('Error verifying salon pin payment:', error);
    return redirectTo('failed');
  }
}
