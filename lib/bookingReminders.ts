// lib/bookingReminders.ts
// منطق مشترک یادآوری نوبت ۲۴ ساعت قبل — فقط Web Push از خود اپ، بدون SMS.
// هم از instrumentation.ts (زمان‌بند خودکار داخل پروسه) صدا زده می‌شه،
// هم از app/api/cron/send-booking-reminders/route.ts (برای اجرای دستی/بک‌آپ).

import { prisma } from '@/lib/prisma';
import { notifyUserBookingReminderPush } from '@/lib/push';

export async function sendBookingReminders(): Promise<{ sent: number; checked: number }> {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      paymentStatus: 'SUCCESS',
      reminderSentAt: null,
      customerId: { not: null }, // بدون یوزر شناخته‌شده، Push معنی نداره
      date: { gte: windowStart, lte: windowEnd },
    },
    include: { salon: { select: { name: true } } },
  });

  let sentCount = 0;

  for (const booking of bookings) {
    try {
      const formattedDate = new Date(booking.date).toLocaleDateString('fa-IR');

      // اول reminderSentAt رو با updateMany + شرط reminderSentAt:null ست کن (نه update ساده،
      // چون فیلد غیریکتاست) تا اگه چند اجرا هم‌زمان (مثلاً چند instance سرور) پیش اومد،
      // فقط یکیشون برنده بشه و پوش تکراری نره.
      const claimed = await prisma.booking.updateMany({
        where: { id: booking.id, reminderSentAt: null },
        data: { reminderSentAt: new Date() },
      });
      if (claimed.count === 0) {
        // یه اجرای موازی دیگه قبلاً همین نوبت رو گرفته
        continue;
      }

      await notifyUserBookingReminderPush(booking.customerId as string, {
        salonName: booking.salon.name,
        date: formattedDate,
        time: booking.startTime,
      });

      sentCount++;
    } catch (err) {
      console.error(`خطا در ارسال یادآوری پوش برای نوبت ${booking.id}:`, err);
    }
  }

  return { sent: sentCount, checked: bookings.length };
}
