// lib/concurrency.ts
//
// اجرای یک worker روی لیستی از آیتم‌ها با سقف هم‌زمانی (بدون نیاز به پکیج p-limit).
// برای این‌که ارسال هزاران پوش/آپدیت یا پشت‌سرهم (کند) یا همه‌ی‌شان با هم (له‌کننده‌ی
// دیتابیس و شبکه) اجرا نشود.

export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
): Promise<void> {
  if (items.length === 0) return;

  let next = 0;
  const runnerCount = Math.min(Math.max(1, limit), items.length);

  const runners = Array.from({ length: runnerCount }, async () => {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      await worker(items[i], i);
    }
  });

  await Promise.all(runners);
}