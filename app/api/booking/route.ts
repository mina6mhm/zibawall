// app/api/booking/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';
import { BOOKING_APP_FEE } from '@/lib/constants';
import {
  getTotalDuration,
  getStaffNames,
  findBookingConflict,
  isWithinWorkingHours,
  jsDateToPersianDayIndex,
} from '@/lib/booking-availability';

export const dynamic = 'force-dynamic';

const mobileRegex = /^09\d{9}$/;

async function getOwnedSalonFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return { error: 'ابتدا وارد حساب کاربری شوید', status: 401 as const };

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return { error: 'توکن نامعتبر است', status: 401 as const };
  }

  const salon = await prisma.salon.findUnique({
    where: { userId: decoded.userId },
  });

  if (!salon) return { error: 'شما سالنی ثبت نکرده‌اید', status: 404 as const };

  return { salon, decoded };
}

// پاک‌سازی و اعتبارسنجی آرایه‌ی خدمات (شامل staffName و duration هر ردیف)
function sanitizeServices(
  services: any
): { name: string; price?: number; staffName?: string; staffPercentage?: number; duration?: number }[] {
  if (!Array.isArray(services)) return [];

  return services
    .map((s: any) => ({
      name: typeof s?.name === 'string' ? s.name.trim() : '',
      price: typeof s?.price === 'number' && s.price > 0 ? s.price : undefined,
      staffName:
        typeof s?.staffName === 'string' && s.staffName.trim() ? s.staffName.trim() : undefined,
      staffPercentage:
        typeof s?.staffPercentage === 'number' && s.staffPercentage > 0 && s.staffPercentage <= 100
          ? s.staffPercentage
          : undefined,
      duration:
        typeof s?.duration === 'number' && s.duration > 0 ? Math.round(s.duration) : undefined,
    }))
    .filter((s) => s.name !== '');
}

// بررسی تداخل زمانی + ساعات کاری برای یک نوبت جدید/ویرایش‌شده.
// اگر مشکلی بود، پیام خطا برمی‌گرداند؛ اگر همه‌چیز اوکی بود null برمی‌گرداند.
async function checkForConflict(params: {
  salonId: string;
  date: Date;
  startTime: string;
  durationMinutes: number;
  staffNames: string[];
  excludeBookingId?: string;
}): Promise<string | null> {
  const { salonId, date, startTime, durationMinutes, staffNames, excludeBookingId } = params;

  const dayIndex = jsDateToPersianDayIndex(date);
  const schedule = await prisma.salonSchedule.findUnique({
    where: { salonId_dayOfWeek: { salonId, dayOfWeek: dayIndex } },
  });

  if (schedule && !schedule.isOpen) {
    return 'طبق ساعات کاری تنظیم‌شده، سالن در این روز تعطیل است';
  }

  const openTime = schedule?.openTime || '10:00';
  const closeTime = schedule?.closeTime || '20:00';

  if (!isWithinWorkingHours(startTime, durationMinutes, openTime, closeTime)) {
    return `این ساعت خارج از بازه‌ی کاری سالن (${openTime} تا ${closeTime}) است`;
  }

  const dayBookings = await prisma.booking.findMany({
    where: {
      salonId,
      date,
      status: { not: 'CANCELLED' },
      ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
    },
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

  const conflict = findBookingConflict({ startTime, durationMinutes, staffNames, existingBookings, timeBlocks });

  if (conflict?.type === 'BOOKING') return 'این بازه با یک نوبت دیگر تداخل دارد';
  if (conflict?.type === 'BLOCK') return 'این بازه توسط خودتان مسدود شده است';

  return null;
}

// دریافت لیست نوبت‌های سالنِ کاربر لاگین‌شده
export async function GET(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const bookings = await prisma.booking.findMany({
      where: { salonId: result.salon.id },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت نوبت‌ها' }, { status: 500 });
  }
}

// ساخت نوبت جدید توسط سالن‌دار (ثبت دستی)
export async function POST(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { salon } = result;

    const body = await req.json();
    const { customerName, customerPhone, date, startTime, services, depositAmount, force } = body;

    if (!customerPhone || !mobileRegex.test(customerPhone)) {
      return NextResponse.json({ error: 'شماره موبایل مشتری معتبر نیست' }, { status: 400 });
    }

    if (!date || !startTime) {
      return NextResponse.json({ error: 'تاریخ و ساعت نوبت الزامی است' }, { status: 400 });
    }

    const cleanedServices = sanitizeServices(services);

    if (cleanedServices.length === 0) {
      return NextResponse.json({ error: 'حداقل یک خدمت معتبر وارد کنید' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    const totalDuration = getTotalDuration(cleanedServices);
    const staffNames = getStaffNames(cleanedServices);

    if (!force) {
      const conflictMessage = await checkForConflict({
        salonId: salon.id,
        date: parsedDate,
        startTime,
        durationMinutes: totalDuration,
        staffNames,
      });
      if (conflictMessage) {
        return NextResponse.json({ error: conflictMessage, conflict: true }, { status: 409 });
      }
    }

    const finalDepositAmount =
      typeof depositAmount === 'number' && depositAmount > 0 ? Math.round(depositAmount) : 0;

    const totalAmount = finalDepositAmount + BOOKING_APP_FEE;

    const existingCustomer = await prisma.user.findUnique({
      where: { phone: customerPhone },
    });

    const booking = await prisma.booking.create({
      data: {
        salonId: salon.id,
        customerId: existingCustomer?.id || null,
        customerName: customerName?.trim() || null,
        customerPhone,
        date: parsedDate,
        startTime,
        services: cleanedServices,
        depositAmount: finalDepositAmount,
        appFee: BOOKING_APP_FEE,
        totalAmount,
        source: 'MANUAL',
      },
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت نوبت' }, { status: 500 });
  }
}

// ویرایش نوبت (فقط تا زمانی که هنوز CONFIRMED نشده، یعنی مشتری پرداخت نکرده)
export async function PUT(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { salon } = result;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'آیدی نوبت ارسال نشده است' }, { status: 400 });
    }

    const existingBooking = await prisma.booking.findUnique({ where: { id } });

    if (!existingBooking || existingBooking.salonId !== salon.id) {
      return NextResponse.json({ error: 'نوبتی یافت نشد' }, { status: 404 });
    }

    const body = await req.json();
    const { customerName, customerPhone, date, startTime, services, depositAmount, force } = body;

    if (!customerPhone || !mobileRegex.test(customerPhone)) {
      return NextResponse.json({ error: 'شماره موبایل مشتری معتبر نیست' }, { status: 400 });
    }

    if (!date || !startTime) {
      return NextResponse.json({ error: 'تاریخ و ساعت نوبت الزامی است' }, { status: 400 });
    }

    const cleanedServices = sanitizeServices(services);

    if (cleanedServices.length === 0) {
      return NextResponse.json({ error: 'حداقل یک خدمت معتبر وارد کنید' }, { status: 400 });
    }

    const parsedDate = new Date(date);
    const totalDuration = getTotalDuration(cleanedServices);
    const staffNames = getStaffNames(cleanedServices);

    if (!force) {
      const conflictMessage = await checkForConflict({
        salonId: salon.id,
        date: parsedDate,
        startTime,
        durationMinutes: totalDuration,
        staffNames,
        excludeBookingId: id,
      });
      if (conflictMessage) {
        return NextResponse.json({ error: conflictMessage, conflict: true }, { status: 409 });
      }
    }

    const finalDepositAmount =
      typeof depositAmount === 'number' && depositAmount > 0 ? Math.round(depositAmount) : 0;

    const totalAmount = finalDepositAmount + existingBooking.appFee;

    const existingCustomer = await prisma.user.findUnique({
      where: { phone: customerPhone },
    });

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        customerId: existingCustomer?.id || null,
        customerName: customerName?.trim() || null,
        customerPhone,
        date: parsedDate,
        startTime,
        services: cleanedServices,
        depositAmount: finalDepositAmount,
        totalAmount,
      },
    });

    return NextResponse.json({ success: true, booking: updatedBooking }, { status: 200 });
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({ error: 'خطای سرور در ویرایش نوبت' }, { status: 500 });
  }
}

// حذف/لغو یک نوبت توسط سالن‌دار
export async function DELETE(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'آیدی نوبت ارسال نشده است' }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });

    if (!booking || booking.salonId !== result.salon.id) {
      return NextResponse.json({ error: 'نوبتی یافت نشد' }, { status: 404 });
    }

    await prisma.booking.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف نوبت' }, { status: 500 });
  }
}