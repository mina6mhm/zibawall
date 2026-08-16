// app/api/booking-online/available-slots/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// روزهای هفته میلادی → شمسی
const GREGORIAN_TO_PERSIAN_DAY: Record<number, string> = {
  6: 'شنبه',
  0: 'یکشنبه',
  1: 'دوشنبه',
  2: 'سه‌شنبه',
  3: 'چهارشنبه',
  4: 'پنجشنبه',
  5: 'جمعه',
};

const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// تبدیل "HH:MM" به دقیقه از ابتدای روز
function timeToMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// تبدیل دقیقه به "HH:MM"
function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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
): { open: boolean; start: string; end: string } {
  const closedDays = salon.closedDays ?? [];
  const parsedHours = parseWorkingHoursToTimes(salon.workingHours);
  return {
    open: !closedDays.includes(persianDayName),
    start: parsedHours?.start ?? '09:00',
    end: parsedHours?.end ?? '20:00',
  };
}

/**
 * GET /api/booking-online/available-slots
 * query params:
 *   salonId    — آیدی سالن
 *   serviceId  — آیدی خدمت
 *   date       — تاریخ میلادی "YYYY-MM-DD"
 *   staffId?   — اختیاری: آیدی پرسنل خاص (اگه نباشه = همه‌ی پرسنل واجد شرایط)
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const salonId   = searchParams.get('salonId');
  const serviceId = searchParams.get('serviceId');
  const dateStr   = searchParams.get('date');
  const staffIdParam = searchParams.get('staffId'); // null = همه

  if (!salonId || !serviceId || !dateStr) {
    return NextResponse.json({ error: 'salonId، serviceId و date الزامی هستند' }, { status: 400 });
  }

  // ── ۱. دریافت اطلاعات سالن + برنامه هفتگی ──────────────────────────────
  const [salon, salonScheduleRow, service] = await Promise.all([
    prisma.salon.findUnique({ where: { id: salonId } }),
    prisma.salonSchedule.findUnique({ where: { salonId } }),
    prisma.bookingService.findUnique({ where: { id: serviceId } }),
  ]);

  if (!salon || !salon.bookingEnabled) {
    return NextResponse.json({ error: 'سیستم نوبت‌دهی این سالن فعال نیست' }, { status: 400 });
  }
  if (!service || !service.isActive || service.salonId !== salonId) {
    return NextResponse.json({ error: 'خدمت یافت نشد' }, { status: 404 });
  }

  const gridMinutes = salonScheduleRow?.gridMinutes ?? 30;
  const durationMin = service.durationMin;

  // ── ۲. تعیین روز هفته و ساعت کاری پیش‌فرض سالن ────────────────────────
  const date = new Date(dateStr + 'T00:00:00Z');
  const persianDayName = GREGORIAN_TO_PERSIAN_DAY[date.getUTCDay()];

  let defaultDaySchedule: { open: boolean; start: string; end: string } | undefined;

  if (salonScheduleRow?.weeklySchedule && Object.keys(salonScheduleRow.weeklySchedule as any).length > 0) {
    const weeklySchedule = salonScheduleRow.weeklySchedule as Record
      string,
      { open: boolean; start: string; end: string }
    >;
    defaultDaySchedule = weeklySchedule[persianDayName];
  }

  // fallback: برنامه‌ای در دیتابیس ذخیره نشده — از اطلاعات ثبت‌نام سالن استفاده کن
  if (!defaultDaySchedule) {
    defaultDaySchedule = buildFallbackDaySchedule(persianDayName, {
      closedDays: salon.closedDays,
      workingHours: salon.workingHours,
    });
  }

  // ── ۲.۵. چک تعطیلی/تغییر ساعت اختصاصی همین تاریخ (override خودِ سالن) ──
  const salonOverride = await prisma.salonScheduleOverride.findUnique({
    where: { salonId_date: { salonId, date: dateStr } },
  });

  if (salonOverride) {
    if (salonOverride.isClosed) {
      // این تاریخ خاص، سالن تعطیله (مستقل از برنامه‌ی هفتگی)
      return NextResponse.json({ slots: [], staff: [] });
    }
    if (salonOverride.start) defaultDaySchedule = { ...defaultDaySchedule, start: salonOverride.start };
    if (salonOverride.end)   defaultDaySchedule = { ...defaultDaySchedule, end: salonOverride.end };
  }

  if (!defaultDaySchedule.open) {
    // این روز طبق برنامه‌ی هفتگی سالن تعطیله
    return NextResponse.json({ slots: [], staff: [] });
  }

  const salonStart = timeToMin(defaultDaySchedule.start);
  const salonEnd   = timeToMin(defaultDaySchedule.end);

  // ── ۳. پرسنل واجد شرایط (کسانی که این خدمت رو انجام می‌دن) ────────────
  const eligibleStaff = await prisma.staff.findMany({
    where: {
      salonId,
      bookingServices: { some: { bookingServiceId: serviceId } },
      ...(staffIdParam ? { id: staffIdParam } : {}),
    },
    include: {
      scheduleOverrides: {
        where: { date: dateStr },
      },
    },
  });

  if (eligibleStaff.length === 0) {
    return NextResponse.json({ slots: [], staff: [] });
  }

  // ── ۴. نوبت‌های تأییدشده/در انتظار پرداخت برای همین تاریخ ──────────────
  const now = new Date();
  const existingBookings = await prisma.booking.findMany({
    where: {
      salonId,
      date: { gte: new Date(dateStr + 'T00:00:00Z'), lt: new Date(dateStr + 'T23:59:59Z') },
      OR: [
        { status: 'CONFIRMED' },
        { status: 'PENDING_PAYMENT', expiresAt: { gt: now } },
      ],
    },
  });

  // ── ۵. محاسبه اسلات‌های آزاد برای هر پرسنل ─────────────────────────────
  const slotStaffMap: Record<string, { id: string; name: string }[]> = {};

  for (const s of eligibleStaff) {
    let staffStart = salonStart;
    let staffEnd   = salonEnd;
    let isDayOff   = (s.offDays ?? []).includes(persianDayName);

    const override = s.scheduleOverrides[0];
    if (override) {
      if (override.isDayOff) {
        isDayOff = true;
      } else {
        if (override.start) staffStart = timeToMin(override.start);
        if (override.end)   staffEnd   = timeToMin(override.end);
      }
    }

    if (isDayOff) continue;

    const staffBookings = existingBookings.filter((b) => {
      const services = b.services as any[];
      return services.some((sv) => sv.staffId === s.id || sv.staffName === s.name);
    });

    const busyRanges: { start: number; end: number }[] = staffBookings.map((b) => {
      const start = timeToMin(b.startTime);
      const services = b.services as any[];
      const totalDuration = services.reduce((acc: number, sv: any) => acc + (sv.durationMin ?? 0), 0);
      return { start, end: start + (totalDuration || 60) };
    });

    let cursor = staffStart;
    while (cursor + durationMin <= staffEnd) {
      const slotEnd = cursor + durationMin;
      const time = minToTime(cursor);

      const isBusy = busyRanges.some((r) => cursor < r.end && slotEnd > r.start);

      if (!isBusy) {
        if (!slotStaffMap[time]) slotStaffMap[time] = [];
        slotStaffMap[time].push({ id: s.id, name: s.name });
      }

      cursor += gridMinutes;
    }
  }

  // ── ۶. ساخت خروجی نهایی ─────────────────────────────────────────────────
  const slots = Object.entries(slotStaffMap)
    .map(([time, availableStaff]) => ({ time, availableStaff }))
    .sort((a, b) => a.time.localeCompare(b.time));

  const staffList = eligibleStaff.map((s) => ({ id: s.id, name: s.name }));

  return NextResponse.json({ slots, staff: staffList, gridMinutes, durationMin });
}