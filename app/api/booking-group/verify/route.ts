//app/api/booking-group/verify/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyZarinpalPayment } from '@/lib/zarinpal';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const groupId = searchParams.get('groupId');

  const baseUrl = new URL(req.url).origin;
  const redirectTo = (query: string) => NextResponse.redirect(`${baseUrl}/appointments?${query}`);

  if (!groupId || !authority) return redirectTo('paymentFailed=1');

  const group = await prisma.bookingGroup.findUnique({ where: { id: groupId } });
  if (!group || group.authority !== authority) return redirectTo('paymentFailed=1');

  if (status !== 'OK') {
    await prisma.bookingGroup.update({ where: { id: group.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('paymentFailed=1');
  }

  try {
    const result = await verifyZarinpalPayment({ amountToman: group.totalAmount, authority });

    if (result.success) {
      await prisma.$transaction([
        prisma.bookingGroup.update({
          where: { id: group.id },
          data: { paymentStatus: 'SUCCESS', refId: String(result.refId) },
        }),
        prisma.booking.updateMany({
          where: { bookingGroupId: group.id },
          data: { paymentStatus: 'SUCCESS', status: 'CONFIRMED' },
        }),
      ]);
      return redirectTo('paymentSuccess=1');
    }

    await prisma.bookingGroup.update({ where: { id: group.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('paymentFailed=1');
  } catch (error) {
    console.error('Error verifying group payment:', error);
    return redirectTo('paymentFailed=1');
  }
}