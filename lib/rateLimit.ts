// lib/rateLimit.ts
// محدودکننده‌ی ساده در حافظه‌ی همین پروسه.
// ⚠️ اگر چند instance/سرور یا serverless دارید، شمارنده‌ها بین آن‌ها مشترک نیست؛
// برای محافظت کامل از Redis/Upstash استفاده کنید (همین interface را نگه دارید).

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
const MAX_KEYS = 50_000;
let lastSweep = 0;

function sweep(now: number) {
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
  // سپر حافظه: اگر هنوز خیلی بزرگ بود (حمله با کلیدهای تصادفی)، همه را پاک کن
  if (store.size > MAX_KEYS) store.clear();
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  if (now - lastSweep > 60_000 || store.size > MAX_KEYS) sweep(now);

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)) };
  }
  return { ok: true, retryAfter: 0 };
}

export function resetRateLimit(key: string) {
  store.delete(key);
}

// فقط پشت پروکسی/CDN مورد اعتماد (Nginx, Cloudflare, Vercel) معتبر است
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'unknown';
}