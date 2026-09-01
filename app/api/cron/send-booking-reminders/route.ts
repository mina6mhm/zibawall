// app/api/cron/send-booking-reminders/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendBookingReminderSms } from '@/lib/sms';
import { notifyUserBookingReminderPush } from '@/lib/push';

export const dynamic = 'force-dynamic';

// این مسیر باید هر ساعت (مثلاً با Vercel Cron) صدا زده بشه.
// طبق درخواست: تا وقتی مشتری بیعانه رو پرداخت نکرده و نوبت CONFIRMED نشده، پیامکی ارسال نمی‌شه.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  const now = new Date();
  const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        status: 'CONFIRMED',
        paymentStatus: 'SUCCESS',
        reminderSentAt: null,
        date: { gte: windowStart, lte: windowEnd },
      },
      include: { salon: { select: { name: true } }, customer: { select: { id: true } } },
    });

    let sentCount = 0;
    for (const booking of bookings) {
      try {
        const formattedDate = new Date(booking.date).toLocaleDateString('fa-IR');

        await sendBookingReminderSms({
          phone: booking.customerPhone,
          salonName: booking.salon.name,
          date: formattedDate,
          time: booking.startTime,
        });

        // دقیقاً همون مکانیزم Web Push که برای ادمین‌ها استفاده می‌شه؛ اگه مشتری
        // یوزر شناخته‌شده باشه و روی مرورگری subscribe کرده باشه، نوتیف می‌گیره.
        // خودش عمداً throw نمی‌کنه، پس جریان اصلی (پیامک + reminderSentAt) رو نمی‌شکنه.
        if (booking.customer?.id) {
          notifyUserBookingReminderPush(booking.customer.id, {
            salonName: booking.salon.name,
            date: formattedDate,
            time: booking.startTime,
          }).catch((pushError) => {
            console.error(`خطا در ارسال نوتیف پوش برای نوبت ${booking.id}:`, pushError);
          });
        }

        await prisma.booking.update({
          where: { id: booking.id },
          data: { reminderSentAt: new Date() },
        });
        sentCount++;
      } catch (smsError) {
        console.error(`خطا در ارسال یادآوری برای نوبت ${booking.id}:`, smsError);
      }
    }

    return NextResponse.json({ success: true, sent: sentCount, checked: bookings.length }, { status: 200 });
  } catch (error) {
    console.error('Error sending booking reminders:', error);
    return NextResponse.json({ error: 'خطای سرور در ارسال یادآوری‌ها' }, { status: 500 });
  }
}