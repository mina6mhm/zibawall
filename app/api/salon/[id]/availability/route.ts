// app/api/salon/[id]/availability/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  getTotalDuration, getStaffNames, jsDateToPersianDayIndex, generateAvailableSlots,
} from '@/lib/booking-availability';
import { toDateOnlyAnchor } from '@/lib/dateUtils';

// لیست ساعات خالیِ یک روز خاص برای مدت‌زمان مشخص (مجموع خدمات انتخاب‌شده)
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: salonId } = await params;
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');
  const duration = Number(searchParams.get('duration'));

  if (!dateStr || !duration || duration <= 0) {
    return NextResponse.json({ error: 'پارامترهای نامعتبر' }, { status: 400 });
  }

  const date = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(date.getTime())) {
    return NextResponse.json({ error: 'تاریخ نامعتبر است' }, { status: 400 });
  }

  const dayIndex = jsDateToPersianDayIndex(date);
  const schedule = await prisma.salonSchedule.findUnique({
    where: { salonId_dayOfWeek: { salonId, dayOfWeek: dayIndex } },
  });

  const isOpen = schedule ? schedule.isOpen : true;
  const openTime = schedule?.openTime || '10:00';
  const closeTime = schedule?.closeTime || '20:00';

  if (!isOpen) {
    return NextResponse.json({ isOpen: false, openTime, closeTime, slots: [] }, { status: 200 });
  }

  const dayBookings = await prisma.booking.findMany({
    where: { salonId, date, status: { not: 'CANCELLED' } },
  });
  const existingBookings = dayBookings.map((b) => ({
    id: b.id,
    startTime: b.startTime,
    durationMinutes: getTotalDuration(b.services as any),
    staffNames: getStaffNames(b.services as any),
  }));

  const dayBlocks = await prisma.timeBlock.findMany({ where: { salonId, date } });
  const timeBlocks = dayBlocks.map((tb) => ({
    id: tb.id,
    startTime: tb.startTime,
    endTime: tb.endTime,
    staffName: tb.staffName,
  }));

  const todayStr = toDateOnlyAnchor(new Date()).toISOString().slice(0, 10);

  const slots = generateAvailableSlots({
    openTime,
    closeTime,
    durationMinutes: duration,
    existingBookings,
    timeBlocks,
    isToday: dateStr === todayStr,
    now: new Date(),
  });

  return NextResponse.json({ isOpen: true, openTime, closeTime, slots }, { status: 200 });
}