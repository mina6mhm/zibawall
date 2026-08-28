//app/api/booking-group/verify/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyZarinpalPayment } from '@/lib/zarinpal';
import { checkGroupSlotsStillAvailable } from '@/lib/bookingSchedule';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const groupId = searchParams.get('groupId');

  const baseUrl = new URL(req.url).origin;
  const redirectTo = (query: string) => NextResponse.redirect(`${baseUrl}/appointments?${query}`);

  if (!groupId || !authority) return redirectTo('paymentFailed=1');

  const group = await prisma.bookingGroup.findUnique({
    where: { id: groupId },
    include: { bookings: true },
  });
  if (!group || group.authority !== authority) return redirectTo('paymentFailed=1');

  if (status !== 'OK') {
    await prisma.bookingGroup.update({ where: { id: group.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('paymentFailed=1');
  }

  try {
    const result = await verifyZarinpalPayment({ amountToman: group.totalAmount, authority });

    if (result.success) {
      // پول واقعاً از مشتری کم شده. قبل از CONFIRM کردن همه‌ی نوبت‌های سبد، دوباره
      // چک می‌کنیم هیچ‌کدوم از اسلات‌ها (که ممکنه هولدشون منقضی شده باشه) توسط
      // شخص دیگه‌ای گرفته نشده باشن — همون ریسکی که lib/bookingSchedule.ts توضیح داده.
      try {
        const outcome = await prisma.$transaction(
          async (tx) => {
            const check = await checkGroupSlotsStillAvailable(group.bookings, tx);

            if (!check.ok) {
              // پول گرفته شده ولی حداقل یکی از اسلات‌ها دیگه در دسترس نیست: کل
              // گروه و همه‌ی نوبت‌هاش CANCELLED می‌شن (نه FAILED، چون paymentStatus
              // باید SUCCESS بمونه تا در حساب‌ها دیده بشه و برای استرداد پیگیری بشه).
              await tx.bookingGroup.update({
                where: { id: group.id },
                data: { paymentStatus: 'SUCCESS', refId: String(result.refId) },
              });
              await tx.booking.updateMany({
                where: { bookingGroupId: group.id },
                data: { paymentStatus: 'SUCCESS', status: 'CANCELLED' },
              });
              return { ok: false as const };
            }

            await tx.bookingGroup.update({
              where: { id: group.id },
              data: { paymentStatus: 'SUCCESS', refId: String(result.refId) },
            });
            await tx.booking.updateMany({
              where: { bookingGroupId: group.id },
              data: { paymentStatus: 'SUCCESS', status: 'CONFIRMED' },
            });
            return { ok: true as const };
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        if (!outcome.ok) {
          return redirectTo('slotTaken=1');
        }
        return redirectTo('paymentSuccess=1');
      } catch (txError) {
        console.error('Error confirming booking group after payment:', txError);
        return redirectTo('slotTaken=1');
      }
    }

    await prisma.bookingGroup.update({ where: { id: group.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('paymentFailed=1');
  } catch (error) {
    console.error('Error verifying group payment:', error);
    return redirectTo('paymentFailed=1');
  }
}