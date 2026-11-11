// lib/redis.ts
//
// کلاینت اختیاری Redis برای حالت چند-instance (rate limit و قفل پرداخت مشترک بین سرورها).
//   REDIS_URL=redis://:password@host:6379
// اگر REDIS_URL تنظیم نشده باشد (یا Redis قطع شود) getRedis() مقدار null می‌دهد و
// کد روی حافظه‌ی همان پروسه برمی‌گردد؛ یعنی قطعی Redis هرگز سایت را از کار نمی‌اندازد.
import IORedis, { type Redis } from 'ioredis';

const g = globalThis as unknown as {
  __zibaRedis?: Redis | null;
  __zibaRedisInit?: boolean;
  __zibaRedisLastLog?: number;
};

export function getRedis(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) return null;
  if (g.__zibaRedisInit) return g.__zibaRedis ?? null;
  g.__zibaRedisInit = true;

  try {
    const client = new IORedis(url, {
      // وقتی Redis پایین است سریع خطا بده (و fallback حافظه کار کند)، نه اینکه درخواست‌ها صف شوند
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      connectTimeout: 2_000,
      commandTimeout: 500,
      retryStrategy: (times) => Math.min(times * 250, 5_000),
    });

    client.on('error', (err) => {
      // جلوگیری از سیل لاگ وقتی Redis قطع است
      const now = Date.now();
      if (now - (g.__zibaRedisLastLog ?? 0) > 30_000) {
        g.__zibaRedisLastLog = now;
        console.error('Redis error (fallback به حافظه‌ی محلی فعال است):', err.message);
      }
    });

    g.__zibaRedis = client;
    return client;
  } catch (err) {
    console.error('Redis init failed:', err);
    g.__zibaRedis = null;
    return null;
  }
}
