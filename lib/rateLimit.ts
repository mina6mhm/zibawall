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

// IP کلاینت.
// ⚠️ هدر X-Forwarded-For را کلاینت می‌تواند جعل کند: اولین آیتمش همان چیزی است که خود کاربر فرستاده.
// پروکسی‌های مورد اعتماد (Nginx/Cloudflare) آیتم خودشان را «به انتها» اضافه می‌کنند، پس IP واقعی
// از انتهای لیست شمرده می‌شود:
//   TRUSTED_PROXY_HOPS=1  → فقط Nginx جلوی اپ (پیش‌فرض)
//   TRUSTED_PROXY_HOPS=2  → Cloudflare + Nginx
//   TRUSTED_PROXY_HOPS=0  → بدون پروکسی؛ هدرها نادیده گرفته می‌شوند (IP قابل‌اعتماد در دسترس نیست)
// اگر پشت Cloudflare هستی و Nginx فقط IPهای Cloudflare را می‌پذیرد، TRUST_CF_CONNECTING_IP=true
// بگذار تا از CF-Connecting-IP استفاده شود.
export function getClientIp(req: Request): string {
  if (process.env.TRUST_CF_CONNECTING_IP === 'true') {
    const cf = req.headers.get('cf-connecting-ip');
    if (cf) return cf.trim();
  }

  const hopsRaw = parseInt(process.env.TRUSTED_PROXY_HOPS ?? '1', 10);
  const hops = Number.isFinite(hopsRaw) && hopsRaw >= 0 ? hopsRaw : 1;
  if (hops === 0) return 'unknown';

  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const parts = forwarded.split(',').map((p) => p.trim()).filter(Boolean);
    if (parts.length > 0) {
      // اگر زنجیره کوتاه‌تر از تعداد پروکسی‌هاست، اولین آیتم (نزدیک‌ترین به کلاینت) را برمی‌داریم
      return parts[Math.max(0, parts.length - hops)];
    }
  }
  return req.headers.get('x-real-ip')?.trim() || 'unknown';
}
