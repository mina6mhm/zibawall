// lib/http.ts
// هلپرهای مشترک مسیرهای API: خواندن امن بدنه‌ی JSON، اعتبارسنجی تاریخ/ساعت، پاسخ ۴۲۹.
import { NextResponse } from 'next/server';
import { toDateOnlyString } from '@/lib/dateUtils';

const DEFAULT_MAX_BYTES = 64 * 1024; // ۶۴ کیلوبایت برای هر بدنه‌ی JSON معمولی

export type JsonBodyResult =
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: NextResponse };

async function readTextCapped(req: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!req.body) return '';

  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null; // بدنه از سقف بزرگ‌تر است (حتی اگر Content-Length نداشت)
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * بدنه‌ی JSON را امن می‌خواند: JSON خراب، بدنه‌ی خالی، آرایه/مقدار غیرآبجکت یا بدنه‌ی خیلی بزرگ
 * به‌جای ۵۰۰ یک پاسخ ۴۰۰/۴۱۳ می‌دهد.
 *
 *   const parsed = await parseJsonBody(req);
 *   if (!parsed.ok) return parsed.response;
 *   const body = parsed.body;
 */
export async function parseJsonBody(
  req: Request,
  maxBytes: number = DEFAULT_MAX_BYTES
): Promise<JsonBodyResult> {
  let text: string | null;
  try {
    text = await readTextCapped(req, maxBytes);
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'درخواست نامعتبر است' }, { status: 400 }) };
  }
  if (text === null) {
    return { ok: false, response: NextResponse.json({ error: 'حجم درخواست بیش از حد مجاز است' }, { status: 413 }) };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, response: NextResponse.json({ error: 'بدنه‌ی درخواست JSON معتبر نیست' }, { status: 400 }) };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, response: NextResponse.json({ error: 'بدنه‌ی درخواست نامعتبر است' }, { status: 400 }) };
  }
  return { ok: true, body: parsed as Record<string, unknown> };
}

export function tooManyRequests(retryAfter: number, message = 'درخواست‌های پیاپی زیاد است. کمی بعد دوباره تلاش کنید') {
  return NextResponse.json(
    { error: message },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

/** "YYYY-MM-DD" معتبر (روز واقعی تقویم، مثلاً 2026-02-31 نامعتبر است) */
export function isIsoDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00.000Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** "HH:MM" ۲۴ساعته */
export function isHHMM(v: unknown): v is string {
  return typeof v === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** امروز به وقت تهران + n روز، به شکل "YYYY-MM-DD" (برای فیلتر بازه‌ی تاریخ‌های رشته‌ای) */
export function tehranDayOffset(days: number): string {
  return toDateOnlyString(new Date(Date.now() + days * 24 * 60 * 60 * 1000));
}

/** عدد صحیح در بازه‌ی [min, max] یا null */
export function intInRange(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}
