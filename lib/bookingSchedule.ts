// lib/bookingSchedule.ts
//
// منطق تعیین «ساعت کاری مؤثر» سالن و پرسنل برای یک تاریخ مشخص.
// این فایل عمداً از app/api/booking-online/available-slots و
// app/api/booking-online/reserve به‌طور مشترک استفاده می‌شود تا این دو
// endpoint هیچ‌وقت از هم جدا نیفتند (باگ قبلی همین بود: available-slots
// همه‌چیز را چک می‌کرد ولی reserve به هیچ‌کدام اعتماد نمی‌کرد و خودش
// چیزی چک نمی‌کرد).

import { prisma } from '@/lib/prisma';
import type { Salon, Staff, StaffScheduleOverride, Prisma, PrismaClient } from '@prisma/client';

// هم prisma معمولی و هم tx داخل یک $transaction این شکل رو دارن — برای
// چک‌های زیر همین کافیه (فقط به query خواندنی booking.findMany نیاز داریم)
type QueryClient = Pick<PrismaClient, 'booking'> | Prisma.TransactionClient;

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

// یک بازه‌ی زمانیِ بسته («تعطیلی موقتِ فقط همین بازه») داخل یک روز
export type TimeRange = { start: string; end: string };

// نسخه‌ی DaySchedule که بازه‌های تعطیلِ داخل همون روز رو هم داره —
// خروجی resolveSalonDaySchedule و ورودی/خروجی توابع مربوط به پرسنل
export type DayScheduleWithClosedRanges = DaySchedule & { closedRanges: TimeRange[] };

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

// پارس امن فیلد JSON دیتابیس closedRanges به آرایه‌ای از بازه‌های معتبر
// "HH:MM"-"HH:MM"؛ هر چیز نامعتبر (فرمت غلط، start >= end) نادیده گرفته میشه
export function parseClosedRanges(raw: unknown): TimeRange[] {
  if (!Array.isArray(raw)) return [];
  const timeRe = /^\d{2}:\d{2}$/;
  return raw
    .filter(
      (r): r is TimeRange =>
        !!r &&
        typeof r === 'object' &&
        typeof (r as any).start === 'string' &&
        typeof (r as any).end === 'string' &&
        timeRe.test((r as any).start) &&
        timeRe.test((r as any).end) &&
        timeToMin((r as any).start) < timeToMin((r as any).end)
    )
    .map((r) => ({ start: r.start, end: r.end }));
}

// آیا بازه‌ی [startMin, endMin) با حداقل یکی از closedRanges تداخل داره؟
export function overlapsClosedRange(
  startMin: number,
  endMin: number,
  closedRanges: TimeRange[]
): boolean {
  return closedRanges.some((r) => {
    const rStart = timeToMin(r.start);
    const rEnd = timeToMin(r.end);
    return startMin < rEnd && endMin > rStart;
  });
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
): Promise<DayScheduleWithClosedRanges> {
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
      return { open: false, start: daySchedule.start, end: daySchedule.end, closedRanges: [] };
    }
    daySchedule = {
      ...daySchedule,
      start: salonOverride.start ?? daySchedule.start,
      end: salonOverride.end ?? daySchedule.end,
    };
    // تعطیلی موقتِ فقط چند ساعتِ همین روز — سالن تعطیل نیست، فقط این بازه‌ها
    // از ساعت کاری کنار گذاشته میشه (مثلاً برای تعمیرات یا استراحت)
    return { ...daySchedule, closedRanges: parseClosedRanges(salonOverride.closedRanges) };
  }

  return { ...daySchedule, closedRanges: [] };
}

/**
 * برنامه‌ی مؤثر یک پرسنل برای یک تاریخ مشخص را برمی‌گرداند: با درنظرگرفتن
 * روز مرخصی ثابت هفتگی (offDays) و override اختصاصی همان روز (مرخصی یا
 * ساعت کاری خاص). اگر پرسنل آن روز کار نمی‌کند dayOff=true برمی‌گردد.
 */
export async function resolveStaffDaySchedule(
  staff: Pick<Staff, 'id' | 'offDays'>,
  dateStr: string,
  salonDaySchedule: DayScheduleWithClosedRanges
): Promise<{ dayOff: boolean; start: string; end: string; closedRanges: TimeRange[] }> {
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
  salonDaySchedule: DayScheduleWithClosedRanges,
  override: Pick<StaffScheduleOverride, 'isDayOff' | 'start' | 'end' | 'closedRanges'> | null | undefined
): { dayOff: boolean; start: string; end: string; closedRanges: TimeRange[] } {
  let start = salonDaySchedule.start;
  let end = salonDaySchedule.end;
  let dayOff = (staff.offDays ?? []).includes(persianDayName);
  // بازه‌های تعطیلِ سالن (مثلاً ساعت تعمیرات) همیشه روی همه‌ی پرسنل هم اثر داره
  let closedRanges = salonDaySchedule.closedRanges;

  if (override) {
    if (override.isDayOff) {
      dayOff = true;
    } else {
      if (override.start) start = override.start;
      if (override.end) end = override.end;
      // بازه‌های تعطیلِ اختصاصیِ خودِ همین پرسنل (مثلاً یک ساعت مرخصی ساعتی)
      // به بازه‌های تعطیلِ سالن اضافه میشه، جایگزینش نمی‌کنه
      closedRanges = [...closedRanges, ...parseClosedRanges(override.closedRanges)];
    }
  }

  return { dayOff, start, end, closedRanges };
}

/** آیا یک "YYYY-MM-DD" + "HH:MM" مشخص، از همین لحظه گذشته است یا نه. */
export function isSlotInPast(dateStr: string, startTime: string, now: Date = new Date()): boolean {
  // startTime به وقت تهران است (UTC+03:30 ثابت؛ ایران ساعت تابستانی ندارد).
  // قبلاً با 'Z' (یعنی UTC) پارس می‌شد و باعث می‌شد نوبت‌ها تا ۳.۵ ساعت بعد از شروع هم قابل رزرو باشند.
  const slotDateTime = new Date(`${dateStr}T${startTime}:00+03:30`);
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

  if (overlapsClosedRange(startMin, endMin, staffSchedule.closedRanges)) {
    return { ok: false, error: `ساعت ${startTime} در این تاریخ موقتاً تعطیل است` };
  }

  return { ok: true };
}

/**
 * چک می‌کند که یک نوبت خاص (که قبلاً ساخته شده و هنوز PENDING_PAYMENT است)
 * هنوز قابل تایید است یا نه: هولدش منقضی نشده، ساعتش نگذشته، و با هیچ
 * نوبت CONFIRMED یا PENDING_PAYMENT-فعالِ دیگری برای همون پرسنل/ساعت تداخل نداره.
 *
 * این تابع دقیقاً همون‌جایی لازمه که reserve نمی‌تونه کافی باشه: لحظه‌ی
 * verify شدنِ پرداخت. چون بین ساخت نوبت (با هولد ۱۰ دقیقه‌ای) و لحظه‌ای که
 * کاربر از درگاه بانک برمی‌گرده، ممکنه هولد منقضی شده باشه و یک نفر دیگه
 * دقیقاً همون اسلات رو گرفته و حتی CONFIRM هم کرده باشه.
 */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * قفل سطح-دیتابیس برای «یک سالن در یک روز».
 * داخل همان $transaction که نوبت را CONFIRM می‌کنی، «قبل از» checkBookingSlotStillAvailable صدایش بزن:
 *
 *   await prisma.$transaction(async (tx) => {
 *     await lockSalonDay(tx, salonId, dateStr);
 *     const check = await checkGroupSlotsStillAvailable(bookings, tx);
 *     if (!check.ok) throw new Error(check.error);
 *     await tx.booking.updateMany({ ... status: 'CONFIRMED' ... });
 *   });
 *
 * بدون این قفل، دو پرداخت هم‌زمان برای یک اسلات هر دو چک را رد می‌کنند و هر دو CONFIRMED می‌شوند
 * (double booking). قفل خودکار با پایان تراکنش آزاد می‌شود و فقط درخواست‌های همان سالن/روز را
 * پشت سر هم می‌چیند.
 */
export async function lockSalonDay(tx: Prisma.TransactionClient, salonId: string, dateStr: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${salonId + ':' + dateStr}))`;
}

export type BookingToCheck = {
  id: string;
  salonId: string;
  date: Date;
  startTime: string;
  services: Prisma.JsonValue;
  expiresAt: Date | null;
  customerId: string | null;
  status?: string;
  bookingGroupId?: string | null;
};

type OtherBooking = {
  id: string;
  bookingGroupId: string | null;
  startTime: string;
  services: Prisma.JsonValue;
};

type Prepared =
  | { error: string }
  | { skip: true }
  | { staffIds: string[]; startMin: number; endMin: number; dateStr: string };

// بخش sync و بدون query: لغو/انقضا/گذشته بودن + محاسبه‌ی بازه‌ی زمانی
function prepareCheck(booking: BookingToCheck, now: Date): Prepared {
  if (booking.status === 'CANCELLED') return { error: 'این رزرو لغو شده است' };

  if (booking.expiresAt && booking.expiresAt.getTime() <= now.getTime()) {
    return { error: 'مهلت این رزرو به پایان رسیده است' };
  }

  const dateStr = new Date(booking.date).toISOString().slice(0, 10);
  if (isSlotInPast(dateStr, booking.startTime, now)) {
    return { error: `ساعت ${booking.startTime} گذشته است` };
  }

  const services = (booking.services as any[]) ?? [];
  const staffIds: string[] = services.map((s: any) => s.staffId).filter(Boolean);
  if (staffIds.length === 0) return { skip: true };

  const startMin = timeToMin(booking.startTime);
  const duration = services.reduce((acc: number, s: any) => acc + (s.durationMin ?? 60), 0);
  return { staffIds, startMin, endMin: startMin + duration, dateStr };
}

// بخش sync: تداخل با نوبت‌های دیگر (از قبل لود شده)
function hasConflict(
  booking: BookingToCheck,
  p: { staffIds: string[]; startMin: number; endMin: number },
  others: OtherBooking[]
): boolean {
  return others.some((ob) => {
    if (ob.id === booking.id) return false;
    // نوبت‌های همین سبد با هم تداخل حساب نمی‌شوند
    if (booking.bookingGroupId && ob.bookingGroupId === booking.bookingGroupId) return false;
    const obServices = (ob.services as any[]) ?? [];
    const obStaffIds: string[] = obServices.map((s: any) => s.staffId).filter(Boolean);
    if (!p.staffIds.some((id) => obStaffIds.includes(id))) return false;
    const obStart = timeToMin(ob.startTime);
    const obDuration = obServices.reduce((acc: number, s: any) => acc + (s.durationMin ?? 60), 0);
    return p.startMin < obStart + obDuration && p.endMin > obStart;
  });
}

const OTHER_SELECT = { id: true, bookingGroupId: true, startTime: true, services: true } as const;

function activeBookingsWhere(now: Date) {
  return {
    OR: [{ status: 'CONFIRMED' as const }, { status: 'PENDING_PAYMENT' as const, expiresAt: { gt: now } }],
  };
}

/**
 * چک می‌کند یک نوبت PENDING_PAYMENT هنوز قابل تایید است (هولد منقضی نشده، ساعتش نگذشته، تداخلی نیست).
 * ⚠️ برای جلوگیری از double-booking باید داخل تراکنش و بعد از lockSalonDay صدا زده شود.
 */
export async function checkBookingSlotStillAvailable(
  booking: BookingToCheck,
  client: QueryClient = prisma
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date();
  const p = prepareCheck(booking, now);
  if ('error' in p) return { ok: false, error: p.error };
  if ('skip' in p) return { ok: true };

  const dayStart = new Date(p.dateStr + 'T00:00:00Z');
  const others = await client.booking.findMany({
    where: {
      salonId: booking.salonId,
      id: { not: booking.id },
      date: { gte: dayStart, lt: new Date(dayStart.getTime() + DAY_MS) },
      ...activeBookingsWhere(now),
    },
    select: OTHER_SELECT,
  });

  if (hasConflict(booking, p, others)) {
    return { ok: false, error: `ساعت ${booking.startTime} توسط شخص دیگری رزرو شده است` };
  }
  return { ok: true };
}

/**
 * همان چک بالا برای همه‌ی نوبت‌های یک BookingGroup — با «یک» query برای کل سبد
 * (قبلاً به‌ازای هر نوبت یک query جدا بود).
 */
export async function checkGroupSlotsStillAvailable(
  bookings: BookingToCheck[],
  client: QueryClient = prisma
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date();

  const prepared: { booking: BookingToCheck; p: Extract<Prepared, { staffIds: string[] }> }[] = [];
  for (const booking of bookings) {
    const p = prepareCheck(booking, now);
    if ('error' in p) return { ok: false, error: p.error };
    if ('skip' in p) continue;
    prepared.push({ booking, p });
  }
  if (prepared.length === 0) return { ok: true };

  const salonIds = Array.from(new Set(prepared.map((x) => x.booking.salonId)));
  const dayMs = prepared.map((x) => new Date(x.p.dateStr + 'T00:00:00Z').getTime());
  const minDay = new Date(Math.min(...dayMs));
  const maxDay = new Date(Math.max(...dayMs) + DAY_MS);

  const others = await client.booking.findMany({
    where: {
      salonId: { in: salonIds },
      date: { gte: minDay, lt: maxDay },
      ...activeBookingsWhere(now),
    },
    select: { ...OTHER_SELECT, salonId: true, date: true },
  });

  for (const { booking, p } of prepared) {
    const sameDay = others.filter(
      (ob) => ob.salonId === booking.salonId && new Date(ob.date).toISOString().slice(0, 10) === p.dateStr
    );
    if (hasConflict(booking, p, sameDay)) {
      return { ok: false, error: `ساعت ${booking.startTime} توسط شخص دیگری رزرو شده است` };
    }
  }
  return { ok: true };
}