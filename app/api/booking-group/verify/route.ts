// app/api/booking-group/verify/route.ts
import { NextResponse, after } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { verifyZarinpalPayment } from '@/lib/zarinpal';
import { checkGroupSlotsStillAvailable, lockSalonDay } from '@/lib/bookingSchedule';
import { dateOnlyIso } from '@/lib/dateUtils';
import { notifyBookingConfirmed } from '@/lib/bookingNotifications';

export const dynamic = 'force-dynamic';

type ResultKind = 'success' | 'failed' | 'slotTaken';
type Outcome = { kind: 'confirmed'; firstTime: boolean } | { kind: 'slotTaken' };

const MAX_TX_ATTEMPTS = 3;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get('Authority');
  const status = searchParams.get('Status');
  const groupId = searchParams.get('groupId');

  // پشت پروکسی origin درخواست ممکن است آدرس داخلی باشد؛ مثل مسیر booking/verify از env استفاده می‌شود
  const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin).replace(/\/+$/, '');

  // برگشت از زرین‌پال روی اپ‌های نیتیو در مرورگر سیستم اتفاق می‌افتد (کوکی لاگین اپ آنجا نیست)
  // → صفحه‌ی عمومی /payment/result؛ در حالت وب (کوکی معتبر) → /appointments
  const auth = await getAuthUser();
  const hasValidSession = !('error' in auth);

  const redirectTo = (result: ResultKind) =>
    hasValidSession
      ? NextResponse.redirect(`${baseUrl}/appointments?paymentResult=${result}`)
      : NextResponse.redirect(`${baseUrl}/payment/result?status=${result}`);

  if (!groupId || !authority) return redirectTo('failed');

  const group = await prisma.bookingGroup.findUnique({
    where: { id: groupId },
    include: { bookings: { select: { status: true } } },
  });
  if (!group || group.authority !== authority) return redirectTo('failed');

  // Idempotent: رفرش صفحه، دکمه‌ی back، callback تکراری یا باز کردن دوباره‌ی لینک از History.
  // قبلاً این حالت دوباره تایید/لغو را اجرا می‌کرد و می‌توانست نوبتِ پرداخت‌شده‌ی CONFIRMED را
  // (مثلاً بعد از پایان مهلت هولد) CANCELLED کند، یا با Status=NOK گروه SUCCESS را FAILED کند.
  if (group.paymentStatus === 'SUCCESS') {
    return redirectTo(group.bookings.some((b) => b.status === 'CONFIRMED') ? 'success' : 'slotTaken');
  }

  // به‌صورت اتمیک فقط اگر هنوز SUCCESS نشده FAILED می‌نویسیم؛ تا روی پرداخت موفقِ هم‌زمان ننویسیم
  const markFailedUnlessPaid = async (): Promise<ResultKind> => {
    const res = await prisma.bookingGroup.updateMany({
      where: { id: group.id, paymentStatus: { not: 'SUCCESS' } },
      data: { paymentStatus: 'FAILED' },
    });
    if (res.count > 0) return 'failed';

    const fresh = await prisma.bookingGroup.findUnique({
      where: { id: group.id },
      select: { bookings: { select: { status: true } } },
    });
    return fresh?.bookings.some((b) => b.status === 'CONFIRMED') ? 'success' : 'slotTaken';
  };

  if (status !== 'OK') {
    return redirectTo(await markFailedUnlessPaid());
  }

  let result: Awaited<ReturnType<typeof verifyZarinpalPayment>>;
  try {
    result = await verifyZarinpalPayment({ amountToman: group.totalAmount, authority });
  } catch (error) {
    // خطای شبکه/timeout: وضعیت نامعلوم است؛ FAILED نمی‌کنیم (زرین‌پال تراکنش تاییدنشده را
    // خودکار برمی‌گرداند) و لینک دوباره قابل verify است.
    console.error('Error verifying group payment:', error);
    return redirectTo('failed');
  }

  if (!result.success) {
    return redirectTo(await markFailedUnlessPaid());
  }

  // پول واقعاً کم شده. تایید گروه داخل تراکنش Serializable + قفل روز سالن + تلاش مجدد روی تداخل.
  const confirmAfterPayment = async (): Promise<Outcome> => {
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_TX_ATTEMPTS; attempt++) {
      try {
        return await prisma.$transaction(
          async (tx): Promise<Outcome> => {
            const fresh = await tx.bookingGroup.findUnique({
              where: { id: group.id },
              include: { bookings: true },
            });
            if (!fresh) return { kind: 'slotTaken' };

            // callback هم‌زمان دیگری قبلاً کار را تمام کرده
            if (fresh.paymentStatus === 'SUCCESS') {
              return fresh.bookings.some((b) => b.status === 'CONFIRMED')
                ? { kind: 'confirmed', firstTime: false }
                : { kind: 'slotTaken' };
            }

            // قفل هر «سالن/روز» به ترتیب ثابت (جلوی deadlock و double-booking را می‌گیرد)
            const days = Array.from(
              new Set(fresh.bookings.map((b) => `${b.salonId}|${dateOnlyIso(new Date(b.date))}`))
            ).sort();
            for (const d of days) {
              const [salonId, dateStr] = d.split('|');
              await lockSalonDay(tx, salonId, dateStr);
            }

            const check = await checkGroupSlotsStillAvailable(fresh.bookings, tx);

            if (!check.ok) {
              // پول گرفته شده ولی حداقل یکی از اسلات‌ها دیگر در دسترس نیست: کل گروه CANCELLED می‌شود
              // (نه FAILED، چون paymentStatus باید SUCCESS بماند تا برای استرداد پیگیری شود).
              await tx.bookingGroup.update({
                where: { id: group.id },
                data: { paymentStatus: 'SUCCESS', refId: String(result.refId) },
              });
              await tx.booking.updateMany({
                where: { bookingGroupId: group.id },
                data: { paymentStatus: 'SUCCESS', status: 'CANCELLED' },
              });
              return { kind: 'slotTaken' };
            }

            await tx.bookingGroup.update({
              where: { id: group.id },
              data: { paymentStatus: 'SUCCESS', refId: String(result.refId) },
            });
            await tx.booking.updateMany({
              where: { bookingGroupId: group.id },
              data: { paymentStatus: 'SUCCESS', status: 'CONFIRMED' },
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

    // پیامک فقط یک‌بار (برنده‌ی تراکنش)؛ callbackهای تکراری یا هم‌زمان دیگر پیامک نمی‌فرستند
    if (outcome.firstTime) {
      after(() => notifyBookingConfirmed({ groupId: group.id, fallbackBaseUrl: baseUrl }));
    }
    return redirectTo('success');
  } catch (txError) {
    // پول تایید شده ولی ثبت در دیتابیس شکست خورد → باید دستی پیگیری شود
    console.error('PAYMENT_VERIFIED_BUT_NOT_CONFIRMED', {
      groupId: group.id,
      authority,
      refId: result.refId,
      error: txError,
    });

    // شاید callback هم‌زمان دیگری موفق شده باشد
    try {
      const latest = await prisma.bookingGroup.findUnique({
        where: { id: group.id },
        select: { paymentStatus: true, bookings: { select: { status: true } } },
      });
      if (latest?.paymentStatus === 'SUCCESS' && latest.bookings.some((b) => b.status === 'CONFIRMED')) {
        return redirectTo('success');
      }
    } catch {}

    return redirectTo('slotTaken');
  }
}
