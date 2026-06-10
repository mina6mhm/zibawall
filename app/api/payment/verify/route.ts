// app/api/payment/verify/route.ts

import { NextResponse } from 'next/server';
import { add } from 'date-fns'; // کتابخانه برای محاسبات تاریخ

export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authority = url.searchParams.get('Authority');
  const status = url.searchParams.get('Status');

  const redirectBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  // ۱. بررسی موفقیت‌آمیز بودن اولیه پرداخت
  if (status !== 'OK' || !authority) {
    return NextResponse.redirect(`${redirectBaseUrl}/payment/failed?error=cancelled`);
  }

  try {
    // ۲. پیدا کردن رکورد پرداخت از طریق کد رهگیری
    const payment = await prisma.payment.findUnique({ where: { authority } });

    if (!payment || payment.status !== 'PENDING') {
      return NextResponse.redirect(`${redirectBaseUrl}/payment/failed?error=invalid_transaction`);
    }

    // ۳. تایید نهایی تراکنش با زرین‌پال
    const merchantId = process.env.ZARINPAL_MERCHANT_ID || 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';
    const amount = payment.amount;

    const verificationRes = await fetch('https://api.zarinpal.com/pg/v4/payment/verify.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchantId,
        authority,
        amount: amount * 10
      }),
    });

    const verificationData = await verificationRes.json();
    
    if (verificationData?.errors?.length > 0) {
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      return NextResponse.redirect(`${redirectBaseUrl}/payment/failed?error=verification_failed`);
    }
    
    const { code, ref_id } = verificationData.data;

    // ۴. اگر تایید موفق بود (کد ۱۰۰ یا ۱۰۱)
    if (code === 100 || code === 101) {
      
      // استفاده از Transaction برای اطمینان از انجام همزمان هر دو آپدیت
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'SUCCESS', refId: ref_id.toString() },
        });

        const salon = await tx.salon.findUnique({
  where: {
    id: payment.salonId,
  },
});
const currentExpireDate =
  salon?.subscriptionExpiresAt &&
  salon.subscriptionExpiresAt > new Date()
    ? salon.subscriptionExpiresAt
    : new Date();

const subscriptionExpiresAt = add(
  currentExpireDate,
  { months: 1 }
);

await tx.salon.update({
  where: {
    id: payment.salonId,
  },
  data: {
    status: 'ACTIVE',
    subscriptionExpiresAt,
    reminderSentAt: null,
  },
});
});
      // هدایت کاربر به صفحه پروفایل با پیام موفقیت
      return NextResponse.redirect(`${redirectBaseUrl}/profile/business?payment=success`);
    } else {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
        return NextResponse.redirect(`${redirectBaseUrl}/payment/failed?error=zarinpal_error_${code}`);
    }

  } catch (error) {
    console.error('Payment Verification Error:', error);
    return NextResponse.redirect(`${redirectBaseUrl}/payment/failed?error=server_error`);
  }
}
