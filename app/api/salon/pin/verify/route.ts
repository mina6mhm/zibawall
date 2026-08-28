// app/api/salon/pin/verify/route.ts
import { NextResponse } from 'next/server';
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
  const redirectTo = (query: string) =>
    NextResponse.redirect(`${baseUrl}/profile/business/overview?${query}`);

  if (!paymentId || !authority) return redirectTo('pinFailed=1');

  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment || payment.authority !== authority) return redirectTo('pinFailed=1');

  // idempotent: اگر قبلاً روی این پرداخت verify موفق انجام شده، دوباره روزها اضافه نشود
  if (payment.status === 'SUCCESS') return redirectTo('pinSuccess=1');

  if (status !== 'OK') {
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    return redirectTo('pinFailed=1');
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

      return redirectTo('pinSuccess=1');
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
    return redirectTo('pinFailed=1');
  } catch (error) {
    console.error('Error verifying salon pin payment:', error);
    return redirectTo('pinFailed=1');
  }
}
