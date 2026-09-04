// app/api/booking/verify/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
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

  // این درخواست (برگشت از زرین‌پال) روی اپ‌های نیتیو داخل مرورگرِ سیستم اتفاق
  // می‌افتد نه WebView خودِ اپ (به lib/openPaymentUrl.ts نگاه کنید)، پس کوکی
  // لاگینِ اپ آنجا وجود ندارد. اگر همین‌جا کوکی معتبر داشتیم (یعنی همون مرورگری
  // که verify را صدا زده لاگین هم بوده — حالت وب)، مستقیم به صفحه‌ی محافظت‌شده
  // برمی‌گردیم؛ در غیر این صورت (حالت اپ نیتیو) به صفحه‌ی عمومی /payment/result
  // که نیازی به لاگین ندارد، وگرنه کاربر به لاگین دوباره پرت می‌شود.
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

  const redirectTo = (result: 'success' | 'failed' | 'slotTaken') =>
    hasValidSession
      ? NextResponse.redirect(`${baseUrl}/appointments?paymentResult=${result}`)
      : NextResponse.redirect(`${baseUrl}/payment/result?status=${result}`);

  if (!bookingId || !authority) return redirectTo('failed');

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.authority !== authority) return redirectTo('failed');

  if (status !== 'OK') {
    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('failed');
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
          return redirectTo('slotTaken');
        }
        return redirectTo('success');
      } catch (txError) {
        console.error('Error confirming booking after payment:', txError);
        // اگر به‌خاطر تداخل تراکنش (P2034) شکست خورد، برای امنیت به‌جای CONFIRM
        // کردن بدون چک، کاربر را به پیگیری دستی ارجاع می‌دهیم.
        return redirectTo('slotTaken');
      }
    }

    await prisma.booking.update({ where: { id: booking.id }, data: { paymentStatus: 'FAILED' } });
    return redirectTo('failed');
  } catch (error) {
    console.error('Error verifying booking payment:', error);
    return redirectTo('failed');
  }
}