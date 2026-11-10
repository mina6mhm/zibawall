// lib/bookingReminders.ts
// یادآوری نوبت ~۲۴ ساعت قبل — فقط Web Push.
// هم از instrumentation.ts و هم از app/api/cron/send-booking-reminders/route.ts صدا زده می‌شود.

import { prisma } from '@/lib/prisma';
import { notifyUserBookingReminderPush } from '@/lib/push';
import { mapLimit } from '@/lib/concurrency';

const HOUR = 60 * 60 * 1000;
// ایران از ۱۴۰۱ ساعت تابستانی ندارد؛ آفست ثابت است.
const IRAN_OFFSET = '+03:30';
const CONCURRENCY = 10;

// booking.date نیمه‌شب UTC است؛ timeZone: 'UTC' جلوی یک‌روز جابه‌جایی را می‌گیرد
const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// زمان واقعی شروع نوبت (date فقط روز است، startTime به وقت تهران)
function bookingStartInstant(date: Date, startTime: string): Date {
  const d = date.toISOString().slice(0, 10);
  return new Date(`${d}T${startTime}:00${IRAN_OFFSET}`);
}

// جلوگیری از هم‌پوشانی اجراها داخل یک پروسه (اگر اجرای قبلی هنوز تمام نشده)
let running = false;

export async function sendBookingReminders(): Promise<{ sent: number; checked: number }> {
  if (running) return { sent: 0, checked: 0 };
  running = true;

  try {
    const now = Date.now();
    const windowStart = now + 23 * HOUR;
    const windowEnd = now + 25 * HOUR;

    // قبلاً پنجره روی «نیمه‌شب UTC روز نوبت» اعمال می‌شد نه ساعت واقعی نوبت؛
    // یعنی یادآوری حوالی ۳:۳۰ بامداد می‌رفت. حالا روزهای کاندید را از DB می‌گیریم
    // و پنجره را روی زمان واقعی شروع نوبت (به وقت تهران) اعمال می‌کنیم.
    const candidates = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        paymentStatus: 'SUCCESS',
        reminderSentAt: null,
        customerId: { not: null },
        date: { gte: new Date(windowStart - 21 * HOUR), lte: new Date(windowEnd + 4 * HOUR) },
      },
      select: {
        id: true,
        customerId: true,
        date: true,
        startTime: true,
        salon: { select: { name: true } },
      },
      take: 2000,
    });

    const due = candidates.filter((b) => {
      const t = bookingStartInstant(b.date, b.startTime).getTime();
      return Number.isFinite(t) && t >= windowStart && t <= windowEnd;
    });

    const results = await mapLimit(due, CONCURRENCY, async (booking) => {
      // claim اتمی: فقط یک اجرا/instance برنده می‌شود
      const claimedAt = new Date();
      try {
        const claimed = await prisma.booking.updateMany({
          where: { id: booking.id, reminderSentAt: null },
          data: { reminderSentAt: claimedAt },
        });
        if (claimed.count === 0) return false;
      } catch (err) {
        console.error(`خطا در claim یادآوری نوبت ${booking.id}:`, err);
        return false;
      }

      try {
        await notifyUserBookingReminderPush(booking.customerId as string, {
          salonName: booking.salon.name,
          date: jalaliDate.format(booking.date),
          time: booking.startTime,
        });
        return true;
      } catch (err) {
        console.error(`خطا در ارسال یادآوری پوش برای نوبت ${booking.id}:`, err);
        // claim را آزاد کن تا اجرای بعدی (داخل همین پنجره) دوباره تلاش کند
        await prisma.booking
          .updateMany({ where: { id: booking.id, reminderSentAt: claimedAt }, data: { reminderSentAt: null } })
          .catch(() => {});
        return false;
      }
    });

    return { sent: results.filter(Boolean).length, checked: due.length };
  } finally {
    running = false;
  }
}