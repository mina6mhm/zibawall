// app/api/booking/verify/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyZarinpalPayment } from '@/lib/zarinpal';
import { checkBookingSlotStillAvailable } from '@/lib/bookingSchedule';

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
      // پول واقعاً از مشتری کم شده (زرین‌پال OK برگردونده). قبل از CONFIRM کردن،
      // باید دوباره چک کنیم که بین لحظه‌ی ساخت هولد و همین الان، هولد منقضی
      // نشده و کس دیگه‌ای همین اسلات رو نگرفته باشه — وگرنه دو نوبت تاییدشده
      // برای یک ساعت/پرسنل خواهیم داشت (رجوع به توضیحات lib/bookingSchedule.ts).
      try {
        const outcome = await prisma.$transaction(
          async (tx) => {
            const check = await checkBookingSlotStillAvailable(booking, tx);

            if (!check.ok) {
              // پول گرفته شده ولی اسلات دیگه در دسترس نیست: paymentStatus را SUCCESS
              // نگه می‌داریم (چون واقعاً پرداخت شده و باید در حساب‌ها دیده بشه و
              // دستی/از طریق زرین‌پال به مشتری استرداد بشه)، ولی خودِ نوبت را
              // CANCELLED می‌کنیم تا اسلات را اشغال نکند و در پنل به‌عنوان نوبتِ
              // نیازمند پیگیری استرداد مشخص باشد.
              await tx.booking.update({
                where: { id: booking.id },
                data: { paymentStatus: 'SUCCESS', status: 'CANCELLED', refId: String(result.refId) },
              });
              return { ok: false as const };
            }

            // از این لحظه نوبت CONFIRMED می‌شه و فقط از همین‌جا به بعد پیامک یادآوری براش مجاز می‌شه.
            // سهم بیعانه طبق فرآیند فعلی توسط تیم پشتیبانی به شماره کارت ثبت‌شده‌ی سالن واریز می‌شود.
            await tx.booking.update({
              where: { id: booking.id },
              data: { paymentStatus: 'SUCCESS', status: 'CONFIRMED', refId: String(result.refId) },
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
        console.error('Error confirming booking after payment:', txError);
        // اگر به‌خاطر تداخل تراکنش (P2034) شکست خورد، برای امنیت به‌جای CONFIRM
        // کردن بدون چک، کاربر را به پیگیری دستی ارجاع می‌دهیم.
        return redirectTo('slotTaken=1');
      }
    }

    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('paymentFailed=1');
  } catch (error) {
    console.error('Error verifying booking payment:', error);
    return redirectTo('paymentFailed=1');
  }
}