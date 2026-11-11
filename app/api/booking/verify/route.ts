// app/api/booking/verify/route.ts
import { NextResponse, after } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { verifyZarinpalPayment } from '@/lib/zarinpal';
import { checkBookingSlotStillAvailable, lockSalonDay } from '@/lib/bookingSchedule';
import { dateOnlyIso } from '@/lib/dateUtils';
import { notifyBookingConfirmed } from '@/lib/bookingNotifications';
import { isAuthorityOf } from '@/lib/paymentAuthority';

export const dynamic = 'force-dynamic';

type ResultKind = 'success' | 'failed' | 'slotTaken';
type Outcome = { kind: 'confirmed'; firstTime: boolean } | { kind: 'slotTaken' };

const MAX_TX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const bookingId = searchParams.get('bookingId');

  // پشت پروکسی origin درخواست ممکن است آدرس داخلی باشد؛ مثل مسیر pay از env استفاده می‌شود
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/+$/, '');

  // برگشت از زرین‌پال روی اپ‌های نیتیو در مرورگر سیستم اتفاق می‌افتد (کوکی لاگین اپ آنجا نیست)
  // → صفحه‌ی عمومی /payment/result؛ در حالت وب (کوکی معتبر) → /appointments
  const auth = await getAuthUser();
  const hasValidSession = !('error' in auth);

  const redirectTo = (result: ResultKind) =>
    hasValidSession
      ? NextResponse.redirect(`${baseUrl}/appointments?paymentResult=${result}`)
      : NextResponse.redirect(`${baseUrl}/payment/result?status=${result}`);

  if (!bookingId || !authority) return redirectTo('failed');

  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  // هر authority ثبت‌شده برای همین نوبت معتبر است (نه فقط آخرین‌ی که روی رکورد نوشته شده)
  if (!booking || !(await isAuthorityOf({ bookingId: booking.id }, booking.authority, authority))) {
    return redirectTo('failed');
  }

  // Idempotent: رفرش صفحه، دکمه‌ی back یا callback تکراری از درگاه.
  // قبلاً verify دوباره صدا زده می‌شد و اگر زرین‌پال «قبلاً تایید شده» برمی‌گرداند،
  // نوبتِ پرداخت‌شده و CONFIRMED به‌اشتباه FAILED می‌شد.
  if (booking.paymentStatus === 'SUCCESS') {
    return redirectTo(booking.status === 'CONFIRMED' ? 'success' : 'slotTaken');
  }

  // به‌صورت اتمیک فقط اگر هنوز SUCCESS نشده FAILED می‌نویسیم؛ قبلاً «خواندن سپس نوشتن» بود و
  // اگر callback موفق هم‌زمان بین این دو مرحله تمام می‌شد، پرداخت موفق به FAILED برمی‌گشت
  const markFailedUnlessPaid = async (): Promise<ResultKind> => {
    const res = await prisma.booking.updateMany({
      where: { id: booking.id, paymentStatus: { not: 'SUCCESS' } },
      data: { paymentStatus: 'FAILED' },
    });
    if (res.count > 0) return 'failed';

    const fresh = await prisma.booking.findUnique({
      where: { id: booking.id },
      select: { status: true },
    });
    return fresh?.status === 'CONFIRMED' ? 'success' : 'slotTaken';
  };

  if (status !== 'OK') {
    return redirectTo(await markFailedUnlessPaid());
  }

  let result: Awaited<ReturnType<typeof verifyZarinpalPayment>>;
  try {
    result = await verifyZarinpalPayment({ amountToman: booking.totalAmount, authority });
  } catch (error) {
    // خطای شبکه/timeout: وضعیت نامعلوم است؛ نوبت را FAILED نمی‌کنیم (زرین‌پال
    // تراکنش تاییدنشده را خودکار برمی‌گرداند) و کاربر می‌تواند دوباره تلاش کند.
    console.error('Error verifying booking payment:', error);
    return redirectTo('failed');
  }

  if (!result.success) {
    return redirectTo(await markFailedUnlessPaid());
  }

  // پول واقعاً کم شده. تایید نوبت داخل تراکنش Serializable + تلاش مجدد روی تداخل.
  const confirmAfterPayment = async (): Promise<Outcome> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_TX_ATTEMPTS; attempt++) {
      try {
        return await prisma.$transaction(
          async (tx): Promise<Outcome> => {
            const fresh = await tx.booking.findUnique({ where: { id: booking.id } });
            if (!fresh) return { kind: 'slotTaken' };

            // callback هم‌زمان دیگری قبلاً کار را تمام کرده
            if (fresh.paymentStatus === 'SUCCESS') {
              return fresh.status === 'CONFIRMED'
                ? { kind: 'confirmed', firstTime: false }
                : { kind: 'slotTaken' };
            }

            // پرداخت‌های هم‌زمان برای همان سالن/روز پشت سر هم می‌ایستند (کمتر P2034 و بدون double-booking)
            await lockSalonDay(tx, fresh.salonId, dateOnlyIso(new Date(fresh.date)));

            // سالن‌دار هم‌زمان با پرداخت نوبت را لغو کرده: پول گرفته شده ولی نوبت
            // نباید دوباره CONFIRMED شود؛ برای پیگیری استرداد SUCCESS ثبت می‌شود
            const slotOk = fresh.status !== 'CANCELLED' && (await checkBookingSlotStillAvailable(fresh, tx)).ok;

            if (!slotOk) {
              await tx.booking.update({
                where: { id: booking.id },
                data: { paymentStatus: 'SUCCESS', status: 'CANCELLED', refId: String(result.refId) },
              });
              return { kind: 'slotTaken' };
            }

            await tx.booking.update({
              where: { id: booking.id },
              data: { paymentStatus: 'SUCCESS', status: 'CONFIRMED', refId: String(result.refId) },
            });
            return { kind: 'confirmed', firstTime: true };
          },
          {
            isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
            // زیر فشار، انتظار برای کانکشن/تراکنش از پیش‌فرض (۲ و ۵ ثانیه) بیشتر می‌شود
            maxWait: 10_000,
            timeout: 15_000,
          }
        );
      } catch (e) {
        lastError = e;
        const isConflict = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2034';
        if (isConflict && attempt < MAX_TX_ATTEMPTS) {
          await sleep(60 * attempt + Math.random() * 100);
          continue;
        }
        throw e;
      }
    }
    throw lastError;
  };

  try {
    const outcome = await confirmAfterPayment();

    if (outcome.kind === 'slotTaken') return redirectTo('slotTaken');

    // پیامک فقط یک‌بار (برنده‌ی تراکنش)؛ callbackهای تکراری دیگر پیامک نمی‌فرستند
    if (outcome.firstTime) {
      after(() => notifyBookingConfirmed({ bookingId: booking.id, fallbackBaseUrl: baseUrl }));
    }
    return redirectTo('success');
  } catch (txError) {
    // پول تایید شده ولی ثبت در دیتابیس شکست خورد → باید دستی پیگیری شود
    console.error('PAYMENT_VERIFIED_BUT_NOT_CONFIRMED', {
      bookingId: booking.id,
      authority,
      refId: result.refId,
      error: txError,
    });

    // شاید callback هم‌زمان دیگری موفق شده باشد
    try {
      const latest = await prisma.booking.findUnique({
        where: { id: booking.id },
        select: { paymentStatus: true, status: true },
      });
      if (latest?.paymentStatus === 'SUCCESS' && latest.status === 'CONFIRMED') {
        return redirectTo('success');
      }
    } catch {}

    return redirectTo('slotTaken');
  }
}