// app/api/booking/verify/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyZarinpalPayment } from '@/lib/zarinpal';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const bookingId = searchParams.get('bookingId');

  const baseUrl = new URL(req.url).origin;
  const redirectTo = (query: string) => NextResponse.redirect(`${baseUrl}/appointments?${query}`);

  if (!bookingId || !authority) return redirectTo('paymentFailed=1');

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.authority !== authority) return redirectTo('paymentFailed=1');

  if (status !== 'OK') {
    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('paymentFailed=1');
  }

  try {
    const result = await verifyZarinpalPayment({ amountToman: booking.totalAmount, authority });

    if (result.success) {
      // از این لحظه نوبت CONFIRMED می‌شه و فقط از همین‌جا به بعد پیامک یادآوری براش مجاز می‌شه.
      // سهم بیعانه طبق فرآیند فعلی توسط تیم پشتیبانی به شماره کارت ثبت‌شده‌ی سالن واریز می‌شود.
      await prisma.booking.update({
        where: { id: booking.id },
        data: { paymentStatus: 'SUCCESS', status: 'CONFIRMED', refId: String(result.refId) },
      });
      return redirectTo('paymentSuccess=1');
    }

    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('paymentFailed=1');
  } catch (error) {
    console.error('Error verifying booking payment:', error);
    return redirectTo('paymentFailed=1');
  }
}