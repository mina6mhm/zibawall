// lib/bookingSchedule.ts
//
// منطق تعیین «ساعت کاری مؤثر» سالن و پرسنل برای یک تاریخ مشخص.
// این فایل عمداً از app/api/booking-online/available-slots و
// app/api/booking-online/reserve به‌طور مشترک استفاده می‌شود تا این دو
// endpoint هیچ‌وقت از هم جدا نیفتند (باگ قبلی همین بود: available-slots
// همه‌چیز را چک می‌کرد ولی reserve به هیچ‌کدام اعتماد نمی‌کرد و خودش
// چیزی چک نمی‌کرد).

import { prisma } from '@/lib/prisma';
import type { Salon, Staff, StaffScheduleOverride } from '@prisma/client';

export const GREGORIAN_TO_PERSIAN_DAY: Record<number, string> = {
  6: 'شنبه',
  0: 'یکشنبه',
  1: 'دوشنبه',
  2: 'سه‌شنبه',
  3: 'چهارشنبه',
  4: 'پنجشنبه',
  5: 'جمعه',
};

export const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

export type DaySchedule = { open: boolean; start: string; end: string };

// تبدیل "HH:MM" به دقیقه از ابتدای روز
export function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// تبدیل دقیقه به "HH:MM"
export function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function persianDayNameForDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00Z');
  return GREGORIAN_TO_PERSIAN_DAY[date.getUTCDay()];
}

// تبدیل ارقام فارسی/عربی به انگلیسی در کل متن
const toEnglishDigitsInText = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

// تلاش برای استخراج ساعت شروع/پایان از متن آزاد ثبت‌نام، مثل «۱۰ صبح تا ۸ شب»
function parseWorkingHoursToTimes(raw: string | null | undefined): { start: string; end: string } | null {
  if (!raw) return null;
  const text = toEnglishDigitsInText(raw);

  const matches = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(صبح|ظهر|بعد\s?از\s?ظهر|عصر|شب)?/g)].filter(
    (m) => m[1] !== undefined
  );
  if (matches.length < 2) return null;

  const toParts = (m: RegExpMatchArray) => {
    let h = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const period = m[3] || '';
    const isPm = period.includes('عصر') || period.includes('شب') || period.includes('بعد');
    const isNoon = period === 'ظهر';
    if ((isPm || isNoon) && h < 12) h += 12;
    if (h > 23) h = 23;
    return { h, minute };
  };

  const startInfo = toParts(matches[0]);
  const endInfo = toParts(matches[matches.length - 1]);
  const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { start: fmt(startInfo.h, startInfo.minute), end: fmt(endInfo.h, endInfo.minute) };
}

// اگر سالن‌دار هنوز برنامه‌ی هفتگی را از تب «برنامه سالن» ذخیره نکرده باشد،
// SalonSchedule در دیتابیس وجود ندارد. در این حالت به‌جای برگرداندن نتیجه‌ی خالی،
// از اطلاعات همان ثبت‌نام اولیه‌ی سالن (workingHours/closedDays) fallback می‌گیریم.
function buildFallbackDaySchedule(
  persianDayName: string,
  salon: { closedDays: string[]; workingHours: string | null }
): DaySchedule {
  const closedDays = salon.closedDays ?? [];
  const parsedHours = parseWorkingHoursToTimes(salon.workingHours);
  return {
    open: !closedDays.includes(persianDayName),
    start: parsedHours?.start ?? '09:00',
    end: parsedHours?.end ?? '20:00',
  };
}

/**
 * برنامه‌ی مؤثر سالن برای یک تاریخ مشخص را برمی‌گرداند:
 * برنامه‌ی هفتگی (یا fallback از اطلاعات ثبت‌نام) + override اختصاصی همان روز.
 * open=false یعنی سالن آن روز تعطیل است (چه به‌خاطر برنامه‌ی هفتگی، چه override).
 */
export async function resolveSalonDaySchedule(
  salon: Pick<Salon, 'id' | 'closedDays' | 'workingHours'>,
  dateStr: string
): Promise<DaySchedule> {
  const persianDayName = persianDayNameForDate(dateStr);

  const [salonScheduleRow, salonOverride] = await Promise.all([
    prisma.salonSchedule.findUnique({ where: { salonId: salon.id } }),
    prisma.salonScheduleOverride.findUnique({
      where: { salonId_date: { salonId: salon.id, date: dateStr } },
    }),
  ]);

  let daySchedule: DaySchedule | undefined;

  if (salonScheduleRow?.weeklySchedule && Object.keys(salonScheduleRow.weeklySchedule as any).length > 0) {
    const weeklySchedule = salonScheduleRow.weeklySchedule as Record<string, DaySchedule>;
    daySchedule = weeklySchedule[persianDayName];
  }

  if (!daySchedule) {
    daySchedule = buildFallbackDaySchedule(persianDayName, salon);
  }

  if (salonOverride) {
    if (salonOverride.isClosed) {
      return { open: false, start: daySchedule.start, end: daySchedule.end };
    }
    daySchedule = {
      ...daySchedule,
      start: salonOverride.start ?? daySchedule.start,
      end: salonOverride.end ?? daySchedule.end,
    };
  }

  return daySchedule;
}

/**
 * برنامه‌ی مؤثر یک پرسنل برای یک تاریخ مشخص را برمی‌گرداند: با درنظرگرفتن
 * روز مرخصی ثابت هفتگی (offDays) و override اختصاصی همان روز (مرخصی یا
 * ساعت کاری خاص). اگر پرسنل آن روز کار نمی‌کند dayOff=true برمی‌گردد.
 */
export async function resolveStaffDaySchedule(
  staff: Pick<Staff, 'id' | 'offDays'>,
  dateStr: string,
  salonDaySchedule: DaySchedule
): Promise<{ dayOff: boolean; start: string; end: string }> {
  const persianDayName = persianDayNameForDate(dateStr);

  const override = await prisma.staffScheduleOverride.findUnique({
    where: { staffId_date: { staffId: staff.id, date: dateStr } },
  });

  return resolveStaffDayScheduleSync(staff, persianDayName, salonDaySchedule, override);
}

// نسخه‌ی sync برای وقتی override از قبل fetch شده (مثلاً در available-slots
// که برای همه‌ی پرسنل با include یک‌جا می‌گیرد تا N+1 query نشود)
export function resolveStaffDayScheduleSync(
  staff: Pick<Staff, 'offDays'>,
  persianDayName: string,
  salonDaySchedule: DaySchedule,
  override: Pick<StaffScheduleOverride, 'isDayOff' | 'start' | 'end'> | null | undefined
): { dayOff: boolean; start: string; end: string } {
  let start = salonDaySchedule.start;
  let end = salonDaySchedule.end;
  let dayOff = (staff.offDays ?? []).includes(persianDayName);

  if (override) {
    if (override.isDayOff) {
      dayOff = true;
    } else {
      if (override.start) start = override.start;
      if (override.end) end = override.end;
    }
  }

  return { dayOff, start, end };
}

/** آیا یک "YYYY-MM-DD" + "HH:MM" مشخص، از همین لحظه گذشته است یا نه. */
export function isSlotInPast(dateStr: string, startTime: string, now: Date = new Date()): boolean {
  const slotDateTime = new Date(`${dateStr}T${startTime}:00Z`);
  return slotDateTime.getTime() <= now.getTime();
}

/**
 * چک کامل: آیا یک بازه‌ی زمانی مشخص برای یک پرسنل، طبق ساعت کاری سالن و
 * خودِ آن پرسنل، قابل رزرو است؟ (تداخل با نوبت‌های دیگر اینجا چک نمی‌شود،
 * چون آن بخش نیاز به query نوبت‌های موجود دارد و در خودِ endpoint هاست.)
 */
export async function validateSlotAgainstSchedule(params: {
  salon: Pick<Salon, 'id' | 'closedDays' | 'workingHours' | 'bookingEnabled'>;
  staff: Pick<Staff, 'id' | 'offDays'>;
  dateStr: string;
  startTime: string;
  durationMin: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const { salon, staff, dateStr, startTime, durationMin } = params;

  if (!salon.bookingEnabled) {
    return { ok: false, error: 'سیستم نوبت‌دهی این سالن فعال نیست' };
  }

  if (isSlotInPast(dateStr, startTime)) {
    return { ok: false, error: `ساعت ${startTime} در تاریخ ${dateStr} گذشته است` };
  }

  const salonDaySchedule = await resolveSalonDaySchedule(salon, dateStr);
  if (!salonDaySchedule.open) {
    return { ok: false, error: 'سالن در این تاریخ تعطیل است' };
  }

  const staffSchedule = await resolveStaffDaySchedule(staff, dateStr, salonDaySchedule);
  if (staffSchedule.dayOff) {
    return { ok: false, error: 'پرسنل انتخابی در این تاریخ مرخصی است' };
  }

  const staffStart = timeToMin(staffSchedule.start);
  const staffEnd = timeToMin(staffSchedule.end);
  const startMin = timeToMin(startTime);
  const endMin = startMin + durationMin;

  if (startMin < staffStart || endMin > staffEnd) {
    return { ok: false, error: `ساعت ${startTime} خارج از ساعت کاری است` };
  }

  return { ok: true };
}