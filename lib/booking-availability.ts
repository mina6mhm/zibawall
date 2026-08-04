// lib/booking-availability.ts
//
// این فایل منطق مشترک محاسبه‌ی تداخل زمانی بین نوبت‌ها و مسدودی‌ها را
// نگه می‌دارد. هم در API ثبت/ویرایش نوبت دستی، هم در API مسدودسازی، و
// هم (در آینده) در API رزرو آنلاین مشتری استفاده می‌شود — تا منطق یکی
// باشد و دو جا تعریف نشود.

export type ServiceLike = {
  name: string;
  price?: number;
  duration?: number; // به دقیقه
  staffName?: string;
  staffPercentage?: number;
};

// وقتی خدمتی مدت‌زمان نداشته باشد (مثلاً نوبت‌های قدیمی قبل از این تغییر)
// این مقدار پیش‌فرض به‌عنوان اشغال تقویم در نظر گرفته می‌شود.
export const DEFAULT_SERVICE_DURATION_MIN = 30;

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(totalMinutes: number): string {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// مجموع مدت‌زمان همه‌ی خدمات یک نوبت (برای فهمیدن چقدر از تقویم اشغال می‌شود)
export function getTotalDuration(services: ServiceLike[] | null | undefined): number {
  if (!Array.isArray(services) || services.length === 0) return DEFAULT_SERVICE_DURATION_MIN;
  const sum = services.reduce((acc, s) => {
    const d = typeof s?.duration === 'number' && s.duration > 0 ? s.duration : DEFAULT_SERVICE_DURATION_MIN;
    return acc + d;
  }, 0);
  return sum > 0 ? sum : DEFAULT_SERVICE_DURATION_MIN;
}

// لیست یکتای اسم پرسنل‌های درگیر در یک نوبت (برای چک تداخل پرسنلی)
export function getStaffNames(services: ServiceLike[] | null | undefined): string[] {
  if (!Array.isArray(services)) return [];
  return Array.from(new Set(services.filter((s) => s?.staffName).map((s) => s.staffName as string)));
}

export type ConflictResult = { type: 'BOOKING' | 'BLOCK'; withId: string } | null;

type ExistingBookingLite = { id: string; startTime: string; durationMinutes: number; staffNames: string[] };
type ExistingBlockLite = { id: string; startTime: string; endTime: string; staffName?: string | null };

// بررسی می‌کند که آیا یک بازه‌ی جدید [startTime, startTime+duration) با نوبت‌ها
// یا مسدودی‌های موجود همان روز تداخل دارد یا نه.
//
// قانون: اگر نوبت جدید یا نوبت/مسدودی موجود هیچ‌کدام پرسنل مشخصی نداشته باشند،
// یعنی کل سالن درگیر است -> هر نوع هم‌پوشانی زمانی = تداخل.
// اگر هر دو طرف پرسنل مشخص دارند، فقط وقتی تداخل واقعی است که پرسنل مشترک باشد
// (دو پرسنل مختلف می‌توانند هم‌زمان روی دو مشتری مختلف کار کنند).
export function findBookingConflict(params: {
  startTime: string;
  durationMinutes: number;
  staffNames: string[];
  existingBookings: ExistingBookingLite[];
  timeBlocks: ExistingBlockLite[];
}): ConflictResult {
  const { startTime, durationMinutes, staffNames, existingBookings, timeBlocks } = params;
  const s = timeToMinutes(startTime);
  const e = s + durationMinutes;

  for (const b of existingBookings) {
    const bs = timeToMinutes(b.startTime);
    const be = bs + b.durationMinutes;
    if (!rangesOverlap(s, e, bs, be)) continue;

    if (staffNames.length === 0 || b.staffNames.length === 0) {
      return { type: 'BOOKING', withId: b.id };
    }
    if (staffNames.some((name) => b.staffNames.includes(name))) {
      return { type: 'BOOKING', withId: b.id };
    }
  }

  for (const tb of timeBlocks) {
    const bs = timeToMinutes(tb.startTime);
    const be = timeToMinutes(tb.endTime);
    if (!rangesOverlap(s, e, bs, be)) continue;

    if (!tb.staffName) {
      return { type: 'BLOCK', withId: tb.id };
    }
    if (staffNames.includes(tb.staffName)) {
      return { type: 'BLOCK', withId: tb.id };
    }
  }

  return null;
}

export function isWithinWorkingHours(
  startTime: string,
  durationMinutes: number,
  openTime: string,
  closeTime: string
): boolean {
  const s = timeToMinutes(startTime);
  const e = s + durationMinutes;
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  return s >= open && e <= close;
}

// تبدیل روز هفته‌ی جاوااسکریپتی (getUTCDay: شنبه=6 ... جمعه=5) به ایندکس
// هفته‌ی شمسی مورد استفاده در SalonSchedule (شنبه=0 ... جمعه=6)
export function jsDateToPersianDayIndex(date: Date): number {
  return (date.getUTCDay() + 1) % 7;
}

// تولید لیست ساعات خالیِ قابل‌رزرو برای یک روز خاص — برای فرم رزرو آنلاین مشتری.
// چون مشتری پرسنل انتخاب نمی‌کند، staffNames همیشه خالی پاس داده می‌شود؛
// یعنی هر تداخل با هر نوبت/مسدودی (حتی مخصوص یک پرسنل خاص) کل بازه را غیرقابل‌انتخاب می‌کند.
export const SLOT_STEP_MINUTES = 15;

export function generateAvailableSlots(params: {
  openTime: string;
  closeTime: string;
  durationMinutes: number;
  existingBookings: { startTime: string; durationMinutes: number; staffNames: string[] }[];
  timeBlocks: { startTime: string; endTime: string; staffName?: string | null }[];
  isToday?: boolean;
  now?: Date;
}): string[] {
  const { openTime, closeTime, durationMinutes, existingBookings, timeBlocks, isToday, now } = params;
  const open = timeToMinutes(openTime);
  const close = timeToMinutes(closeTime);
  const nowMinutes = now ? now.getHours() * 60 + now.getMinutes() : 0;

  const slots: string[] = [];
  for (let start = open; start + durationMinutes <= close; start += SLOT_STEP_MINUTES) {
    if (isToday && start <= nowMinutes) continue;

    const conflict = findBookingConflict({
      startTime: minutesToTime(start),
      durationMinutes,
      staffNames: [],
      existingBookings,
      timeBlocks,
    });
    if (!conflict) slots.push(minutesToTime(start));
  }
  return slots;
}