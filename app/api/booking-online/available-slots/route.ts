// app/api/booking-online/available-slots/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  persianDayNameForDate,
  resolveSalonDaySchedule,
  resolveStaffDayScheduleSync,
  timeToMin,
  minToTime,
  isSlotInPast,
  overlapsClosedRange,
} from '@/lib/bookingSchedule';

export const dynamic = 'force-dynamic';

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

  // ── ۱. دریافت اطلاعات سالن + خدمت ───────────────────────────────────────
  const [salon, service] = await Promise.all([
    prisma.salon.findUnique({ where: { id: salonId } }),
    prisma.bookingService.findUnique({ where: { id: serviceId } }),
  ]);

  if (!salon || !salon.bookingEnabled) {
    return NextResponse.json({ error: 'سیستم نوبت‌دهی این سالن فعال نیست' }, { status: 400 });
  }
  if (!service || !service.isActive || service.salonId !== salonId) {
    return NextResponse.json({ error: 'خدمت یافت نشد' }, { status: 404 });
  }

  const salonScheduleRow = await prisma.salonSchedule.findUnique({ where: { salonId } });
  const gridMinutes = salonScheduleRow?.gridMinutes ?? 30;
  const durationMin = service.durationMin;

  // ── ۲. ساعت کاری مؤثر سالن برای این تاریخ (برنامه هفتگی/fallback + override) ──
  const persianDayName = persianDayNameForDate(dateStr);
  const salonDaySchedule = await resolveSalonDaySchedule(salon, dateStr);

  if (!salonDaySchedule.open) {
    // این روز طبق برنامه‌ی هفتگی یا override سالن تعطیله
    return NextResponse.json({ slots: [], staff: [] });
  }

  const salonStart = timeToMin(salonDaySchedule.start);
  const salonEnd   = timeToMin(salonDaySchedule.end);

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
    const override = s.scheduleOverrides[0];
    const staffSchedule = resolveStaffDayScheduleSync(s, persianDayName, salonDaySchedule, override);

    if (staffSchedule.dayOff) continue;

    const staffStart = timeToMin(staffSchedule.start);
    const staffEnd   = timeToMin(staffSchedule.end);

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

    let cursor = Math.max(staffStart, salonStart);
    const effectiveEnd = Math.min(staffEnd, salonEnd);
    while (cursor + durationMin <= effectiveEnd) {
      const slotEnd = cursor + durationMin;
      const time = minToTime(cursor);

      const isBusy = busyRanges.some((r) => cursor < r.end && slotEnd > r.start);
      const isPast = isSlotInPast(dateStr, time, now);
      // بازه‌های تعطیلی موقت (سالن یا خودِ همین پرسنل) — فقط همین بازه بسته
      // میشه، بقیه‌ی روز طبق ساعت کاری عادی باز می‌مونه
      const isClosedRange = overlapsClosedRange(cursor, slotEnd, staffSchedule.closedRanges);

      if (!isBusy && !isPast && !isClosedRange) {
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