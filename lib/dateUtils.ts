// lib/dateUtils.ts
//
// تمام منطق «روز» و «ساعت» اپ به وقت تهران است، نه timezone سرور.
// قبلاً toDateOnlyAnchor از getFullYear/getMonth/getDate استفاده می‌کرد که به timezone
// سرور وابسته بود؛ روی سرور UTC، ساعت‌های ۰۰:۰۰ تا ۰۳:۳۰ تهران روز قبل را می‌داد.

export const IRAN_TZ = 'Asia/Tehran';
// ایران از ۱۴۰۱ ساعت تابستانی ندارد؛ آفست ثابت است.
export const IRAN_OFFSET = '+03:30';

const tehranParts = new Intl.DateTimeFormat('en-US', {
  timeZone: IRAN_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

// "YYYY-MM-DD" برای روزِ تهرانِ آن لحظه
export const toDateOnlyString = (d: Date): string => {
  const p: Record<string, string> = {};
  for (const part of tehranParts.formatToParts(d)) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}`;
};

// نیمه‌شب UTC همان روزِ تهرانی — فرمتی که در ستون Booking.date ذخیره می‌شود
export const toDateOnlyAnchor = (d: Date): Date => new Date(`${toDateOnlyString(d)}T00:00:00.000Z`);

// "YYYY-MM-DD" از روی مقدار ذخیره‌شده‌ی Booking.date (نیمه‌شب UTC)
export const dateOnlyIso = (date: Date): string => date.toISOString().slice(0, 10);

// زمان واقعی شروع نوبت (date فقط روز است، startTime به وقت تهران)
export function bookingStartInstant(date: Date, startTime: string): Date {
  return new Date(`${dateOnlyIso(date)}T${startTime}:00${IRAN_OFFSET}`);
}

// booking.date نیمه‌شب UTC است؛ timeZone: 'UTC' جلوی یک‌روز جابه‌جایی را می‌گیرد
const jalaliFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export const formatJalaliDate = (date: Date): string => jalaliFormatter.format(date);