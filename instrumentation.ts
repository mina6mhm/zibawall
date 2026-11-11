// instrumentation.ts
export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const globalForReminders = globalThis as unknown as {
    __bookingReminderSchedulerStarted?: boolean;
  };
  if (globalForReminders.__bookingReminderSchedulerStarted) return;
  globalForReminders.__bookingReminderSchedulerStarted = true;

  const ONE_HOUR = 60 * 60 * 1000;
  const STARTUP_DELAY = 30 * 1000;

  const runReminders = async () => {
    try {
      // چند instance = چند زمان‌بند؛ اگر Redis تنظیم باشد فقط یکی از آن‌ها در هر ساعت اجرا می‌کند
      // (جلوگیری از ارسال هم‌زمانِ تکراری یادآوری). اگر Redis نبود/قطع بود، مثل قبل اجرا می‌شود.
      const { getRedis } = await import('@/lib/redis');
      const redis = getRedis();
      if (redis) {
        try {
          const won = await redis.set('lock:booking-reminders', String(process.pid), 'PX', 50 * 60 * 1000, 'NX');
          if (won !== 'OK') return;
        } catch {
          // Redis در دسترس نیست → اجرا بدون قفل
        }
      }

      const { sendBookingReminders } = await import('@/lib/bookingReminders');
      const result = await sendBookingReminders();
      if (result.sent > 0) {
        console.log(
          `⏰ یادآوری نوبت: ${result.sent} پوش ارسال شد (از ${result.checked} نوبت بررسی‌شده).`
        );
      }
    } catch (err) {
      console.error('❌ خطا در اجرای زمان‌بند یادآوری نوبت:', err);
    }
  };

  setTimeout(() => {
    runReminders();
    setInterval(runReminders, ONE_HOUR);
  }, STARTUP_DELAY);

  console.log('⏰ زمان‌بند یادآوری نوبت (داخل خود اپ) فعال شد — هر ساعت یک‌بار اجرا می‌شه.');
}