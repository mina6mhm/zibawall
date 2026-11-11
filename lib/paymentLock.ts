// lib/paymentLock.ts
//
// قفل کوتاه‌مدت برای جلوگیری از دوبار کلیک روی «پرداخت» (کم‌کردن درخواست‌های تکراری به زرین‌پال).
//  • با REDIS_URL: قفل بین همه‌ی instanceها مشترک است (SET NX PX).
//  • بدون Redis (یا هنگام قطعی): روی حافظه‌ی همین پروسه.
//
// ✅ درستیِ پرداخت دیگر به این قفل وابسته نیست: هر authority در جدول PaymentAuthority ثبت می‌شود
// (lib/paymentAuthority.ts) و verify هر authority معتبرِ همان نوبت را می‌پذیرد؛ پس حتی اگر قفل
// (مثلاً هنگام قطعی Redis) رد شود، پرداختِ کاربر با authority قدیمی «ناموفق» دیده نمی‌شود.
import { randomUUID } from 'crypto';
import { getRedis } from '@/lib/redis';

const TTL_MS = 15_000;

// حافظه‌ی محلی (fallback)
const locks = new Map<string, number>();
// توکن قفل‌هایی که همین پروسه در Redis گرفته (برای آزادسازیِ فقط-قفل-خودم)
const held = new Map<string, string>();

function sweep(now: number) {
  if (locks.size < 1000) return;
  for (const [key, at] of locks) {
    if (now - at > TTL_MS) locks.delete(key);
  }
}

function acquireLocal(key: string): boolean {
  const now = Date.now();
  sweep(now);
  const at = locks.get(key);
  if (at && now - at < TTL_MS) return false;
  locks.set(key, now);
  return true;
}

/** true = قفل گرفته شد؛ false = درخواست دیگری در حال پردازش است */
export async function acquirePaymentLock(key: string): Promise<boolean> {
  const redis = getRedis();
  if (redis) {
    try {
      const token = randomUUID();
      const res = await redis.set(`pl:${key}`, token, 'PX', TTL_MS, 'NX');
      if (res === 'OK') {
        held.set(key, token);
        // قفلِ موفق تا پایان TTL می‌ماند و آزاد نمی‌شود؛ ورودی Map را هم بعد از TTL پاک کن تا نشت نکند
        setTimeout(() => {
          if (held.get(key) === token) held.delete(key);
        }, TTL_MS + 1_000).unref?.();
        return true;
      }
      return false;
    } catch {
      // Redis در دسترس نیست → قفل محلی
    }
  }
  return acquireLocal(key);
}

const RELEASE_LUA = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

export async function releasePaymentLock(key: string): Promise<void> {
  locks.delete(key);
  const token = held.get(key);
  if (!token) return;
  held.delete(key);

  const redis = getRedis();
  if (redis) {
    try {
      await redis.eval(RELEASE_LUA, 1, `pl:${key}`, token);
    } catch {
      // قفل خودش بعد از TTL آزاد می‌شود
    }
  }
}
