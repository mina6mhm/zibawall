// lib/validate.ts
// توابع کوچک اعتبارسنجی ورودی — برای اینکه کاربر نتونه فیلد نجومی/نامعتبر بفرسته
// و دیتابیس یا حافظه‌ی سرور رو پر کنه.

/** رشته‌ی تمیز (trim شده)؛ اگر رشته نبود یا از سقف بلندتر بود null برمی‌گردونه */
export function cleanString(v: unknown, max: number): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (s.length > max) return null;
  return s;
}

/** آرایه‌ای از رشته‌ها با سقف تعداد و طول؛ آیتم‌های نامعتبر حذف می‌شن */
export function cleanStringArray(v: unknown, maxItems: number, maxLen: number): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const item of v.slice(0, maxItems)) {
    const s = cleanString(item, maxLen);
    if (s) out.push(s);
  }
  return out;
}

/** فقط آدرس‌های http/https */
export function isHttpUrl(v: unknown, max = 600): v is string {
  if (typeof v !== 'string' || v.length === 0 || v.length > max) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** مختصات [lat, lng] معتبر یا null */
export function cleanCoordinates(v: unknown): [number, number] | null {
  if (!Array.isArray(v) || v.length !== 2) return null;
  const lat = Number(v[0]);
  const lng = Number(v[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return [lat, lng];
}

/** تگ‌های خدمات: یا رشته، یا {name, category}؛ با سقف تعداد و طول */
export function cleanTags(v: unknown, maxItems = 80): (string | { name: string; category: string })[] {
  if (!Array.isArray(v)) return [];
  const out: (string | { name: string; category: string })[] = [];
  for (const t of v.slice(0, maxItems)) {
    if (typeof t === 'string') {
      const s = cleanString(t, 60);
      if (s) out.push(s);
    } else if (t && typeof t === 'object') {
      const name = cleanString((t as any).name, 60);
      const category = cleanString((t as any).category, 60);
      if (name) out.push({ name, category: category || 'سایر' });
    }
  }
  return out;
}
