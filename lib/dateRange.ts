// lib/dateRange.ts
// بازه‌ی تاریخ (?from=YYYY-MM-DD&to=YYYY-MM-DD) برای APIهای لیست نوبت.
// ستون Booking.date نیمه‌شب UTC همان «روز تهرانی» است (به lib/dateUtils.ts نگاه کنید).
// بدون این بازه، لیست نوبت‌ها همه‌ی تاریخچه‌ی سالن را از ابتدا می‌خواند و با رشد سالن کند می‌شود.
import { toDateOnlyAnchor } from '@/lib/dateUtils';

const DAY_MS = 24 * 60 * 60 * 1000;

/** وقتی from نیامده: چند روز گذشته تا آینده‌ی باز */
export const DEFAULT_PAST_DAYS = 31;
/** سقف طول بازه‌ی درخواستی (وقتی هم from و هم to داده شده) */
export const MAX_RANGE_DAYS = 400;
/** سقف تعداد ردیف در یک پاسخ */
export const MAX_BOOKING_ROWS = 3000;

function parseDay(v: string | null): Date | null | undefined {
  if (v === null || v === '') return undefined; // ارسال نشده
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null; // نامعتبر
  const d = new Date(`${v}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v) return null;
  return d;
}

export type DayRange = { from: Date; toExclusive?: Date } | { error: string };

export function parseDayRange(searchParams: URLSearchParams): DayRange {
  const from = parseDay(searchParams.get('from'));
  const to = parseDay(searchParams.get('to'));

  if (from === null || to === null) {
    return { error: 'فرمت تاریخ باید YYYY-MM-DD باشد' };
  }

  const start = from ?? new Date(toDateOnlyAnchor(new Date()).getTime() - DEFAULT_PAST_DAYS * DAY_MS);
  const toExclusive = to ? new Date(to.getTime() + DAY_MS) : undefined;

  if (toExclusive) {
    if (toExclusive.getTime() <= start.getTime()) {
      return { error: 'تاریخ پایان باید بعد از تاریخ شروع باشد' };
    }
    if (toExclusive.getTime() - start.getTime() > MAX_RANGE_DAYS * DAY_MS) {
      return { error: `بازه‌ی تاریخ نباید بیشتر از ${MAX_RANGE_DAYS} روز باشد` };
    }
  }

  return { from: start, toExclusive };
}

export function dateWhere(range: { from: Date; toExclusive?: Date }) {
  return range.toExclusive ? { gte: range.from, lt: range.toExclusive } : { gte: range.from };
}
