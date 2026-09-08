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