// lib/bookingNotifications.ts
// ارسال پیامک تایید نوبت به مشتری، همان لحظه‌ای که نوبت CONFIRMED می‌شود.
// این تابع هیچ‌وقت خطا throw نمی‌کند؛ مشکل پیامک نباید پرداخت/ثبت نوبت را خراب کند.
//
// ⚠️ نیاز به فیلد جدید در schema: Booking.confirmationSmsSentAt (در schema.prisma اضافه شده).
// بدون آن، اگر callback پرداخت دو بار صدا زده شود (رفرش کاربر، retry زرین‌پال)، دو پیامک می‌رود.
//
// 💡 بهتر است صدا زدن این تابع در callback پرداخت await نشود: `void notifyBookingConfirmed(...)`
// (روی سرور Node دائمی؛ اگر serverless هستی، بعد از response ممکن است کار نیمه‌کاره بماند).

import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationSms } from '@/lib/sms';

const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type Target =
  | { groupId: string; fallbackBaseUrl?: string }
  | { bookingId: string; fallbackBaseUrl?: string };

export async function notifyBookingConfirmed(target: Target): Promise<void> {
  try {
    const where =
      'groupId' in target
        ? { bookingGroupId: target.groupId, status: 'CONFIRMED' as const }
        : { id: target.bookingId, status: 'CONFIRMED' as const };

    const bookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        date: true,
        startTime: true,
        services: true,
        customerPhone: true,
        confirmationSmsSentAt: true,
        salon: { select: { id: true, name: true } },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    if (bookings.length === 0) {
      console.warn('📨 پیامک تایید نوبت: هیچ نوبت CONFIRMED پیدا نشد');
      return;
    }

    const first = bookings[0];
    const phone = first.customerPhone;
    if (!phone) {
      console.warn('📨 پیامک تایید نوبت: شماره‌ی مشتری روی نوبت ثبت نشده');
      return;
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || target.fallbackBaseUrl || '').replace(/\/+$/, '');
    if (!baseUrl) {
      console.error('پیامک تایید نوبت ارسال نشد: NEXT_PUBLIC_BASE_URL تنظیم نشده است');
      return;
    }

    // claim اتمی: فقط اولین فراخوانی پیامک می‌فرستد
    const ids = bookings.map((b) => b.id);
    const claimedAt = new Date();
    const claimed = await prisma.booking.updateMany({
      where: { id: { in: ids }, confirmationSmsSentAt: null },
      data: { confirmationSmsSentAt: claimedAt },
    });
    if (claimed.count === 0) return; // قبلاً ارسال شده

    const dates = Array.from(new Set(bookings.map((b) => jalaliDate.format(new Date(b.date)))));
    const times = bookings.map((b) => b.startTime);
    const serviceNames = Array.from(
      new Set(
        bookings.flatMap((b) =>
          Array.isArray(b.services) ? (b.services as any[]).map((s) => String(s?.name ?? '')).filter(Boolean) : []
        )
      )
    );

    try {
      await sendBookingConfirmationSms({
        phone,
        salonName: first.salon.name,
        date: dates.join(' و '),
        time: times.join(' و '),
        services: serviceNames.join('، ') || 'خدمات',
        link: `${baseUrl}/salon/${first.salon.id}`,
      });
    } catch (sendErr) {
      // ارسال شکست خورد: claim را آزاد کن تا فراخوانی بعدی بتواند دوباره تلاش کند
      await prisma.booking
        .updateMany({ where: { id: { in: ids }, confirmationSmsSentAt: claimedAt }, data: { confirmationSmsSentAt: null } })
        .catch(() => {});
      throw sendErr;
    }
  } catch (err) {
    console.error('❌ خطا در ارسال پیامک تایید نوبت:', err);
  }
}