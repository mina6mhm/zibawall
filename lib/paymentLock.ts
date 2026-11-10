// lib/paymentLock.ts
// قفل کوتاه‌مدت در حافظه‌ی همین پروسه برای جلوگیری از دوبار کلیک روی «پرداخت».
// هر درخواست پرداخت یک authority جدید می‌سازد و روی رکورد می‌نویسد؛ اگر کاربر با
// authority قدیمی‌تر پرداخت کند verify آن را «ناموفق» می‌بیند درحالی‌که پول کم شده.
// (فقط در همین instance؛ راه‌حل کامل در چند-سرور: جدول جدا برای همه‌ی authorityها)

const TTL_MS = 15_000;
const locks = new Map<string, number>();

function sweep(now: number) {
  if (locks.size < 1000) return;
  for (const [key, at] of locks) {
    if (now - at > TTL_MS) locks.delete(key);
  }
}

/** true = قفل گرفته شد؛ false = درخواست دیگری در حال پردازش است */
export function acquirePaymentLock(key: string): boolean {
  const now = Date.now();
  sweep(now);
  const at = locks.get(key);
  if (at && now - at < TTL_MS) return false;
  locks.set(key, now);
  return true;
}

export function releasePaymentLock(key: string) {
  locks.delete(key);
}
