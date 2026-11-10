// app/api/cron/send-booking-reminders/route.ts
// این route دیگه لازم نیست از بیرون (مثل crontab سرور) صدا زده بشه —
// یادآوری نوبت الان به‌صورت خودکار داخل خودِ اپ (instrumentation.ts) هر ساعت اجرا می‌شه،
// دقیقاً مثل مکانیزم پوش تایید سالن.
// این route فقط برای اجرای دستی/تست یا به‌عنوان بک‌آپ نگه داشته شده.
import { NextResponse } from 'next/server';
import { sendBookingReminders } from '@/lib/bookingReminders';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // اگر CRON_SECRET تنظیم نشده باشد، قبلاً مقایسه با رشته‌ی "Bearer undefined" انجام می‌شد
  // و هر کسی با همین هدر می‌توانست مسیر را صدا بزند. حالا بدون secret مسیر کاملاً بسته است.
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  try {
    const result = await sendBookingReminders();
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('Error sending booking reminders:', error);
    return NextResponse.json({ error: 'خطای سرور در ارسال یادآوری‌ها' }, { status: 500 });
  }
}
