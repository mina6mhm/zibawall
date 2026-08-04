// app/api/salon/[id]/book/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { BOOKING_APP_FEE } from '@/lib/constants';
import {
  getTotalDuration, getStaffNames, findBookingConflict, isWithinWorkingHours, jsDateToPersianDayIndex,
} from '@/lib/booking-availability';

const mobileRegex = /^09\d{9}$/;

// ثبت نوبت آنلاین توسط مشتریِ لاگین‌کرده
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: salonId } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon || !salon.bookingEnabled) {
      return NextResponse.json({ error: 'این سالن نوبت‌دهی آنلاین ندارد' }, { status: 404 });
    }

    const body = await req.json();
    const { date, startTime, serviceItemIds, customerName, customerPhone } = body;

    if (!customerPhone || !mobileRegex.test(customerPhone)) {
      return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 });
    }
    if (!date || !startTime) {
      return NextResponse.json({ error: 'تاریخ و ساعت الزامی است' }, { status: 400 });
    }
    if (!Array.isArray(serviceItemIds) || serviceItemIds.length === 0) {
      return NextResponse.json({ error: 'حداقل یک خدمت را انتخاب کنید' }, { status: 400 });
    }

    const items = await prisma.serviceItem.findMany({
      where: { id: { in: serviceItemIds }, isActive: true },
      include: { category: true },
    });

    if (items.length !== serviceItemIds.length) {
      return NextResponse.json({ error: 'برخی خدمات انتخاب‌شده دیگر معتبر نیستند' }, { status: 400 });
    }

    // همه‌ی خدمات انتخاب‌شده باید از یک دسته‌بندی، متعلق به همین سالن، و فعال باشند
    const categoryIds = new Set(items.map((i) => i.categoryId));
    if (categoryIds.size > 1) {
      return NextResponse.json({ error: 'همه‌ی خدمات باید از یک دسته‌بندی باشند' }, { status: 400 });
    }
    const category = items[0].category;
    if (category.salonId !== salonId || !category.isActive) {
      return NextResponse.json({ error: 'دسته‌بندی نامعتبر است' }, { status: 400 });
    }

    const parsedDate = new Date(`${date}T00:00:00.000Z`);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json({ error: 'تاریخ نامعتبر است' }, { status: 400 });
    }

    const dayIndex = jsDateToPersianDayIndex(parsedDate);
    const schedule = await prisma.salonSchedule.findUnique({
      where: { salonId_dayOfWeek: { salonId, dayOfWeek: dayIndex } },
    });
    if (schedule && !schedule.isOpen) {
      return NextResponse.json({ error: 'سالن در این روز تعطیل است' }, { status: 409 });
    }
    const openTime = schedule?.openTime || '10:00';
    const closeTime = schedule?.closeTime || '20:00';

    const totalDuration = items.reduce((sum, i) => sum + i.durationMinutes, 0);

    if (!isWithinWorkingHours(startTime, totalDuration, openTime, closeTime)) {
      return NextResponse.json(
        { error: `این ساعت خارج از بازه‌ی کاری سالن (${openTime} تا ${closeTime}) است` },
        { status: 409 }
      );
    }

    const dayBookings = await prisma.booking.findMany({
      where: { salonId, date: parsedDate, status: { not: 'CANCELLED' } },
    });
    const existingBookings = dayBookings.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      durationMinutes: getTotalDuration(b.services as any),
      staffNames: getStaffNames(b.services as any),
    }));
    const dayBlocks = await prisma.timeBlock.findMany({ where: { salonId, date: parsedDate } });
    const timeBlocks = dayBlocks.map((tb) => ({ id: tb.id, startTime: tb.startTime, endTime: tb.endTime, staffName: tb.staffName }));

    // در رزرو آنلاین چون پرسنل انتخاب نمی‌شود، هر تداخلی (حتی مخصوص یک پرسنل) بازه را می‌بندد
    const conflict = findBookingConflict({
      startTime,
      durationMinutes: totalDuration,
      staffNames: [],
      existingBookings,
      timeBlocks,
    });
    if (conflict) {
      return NextResponse.json({ error: 'این بازه دیگر خالی نیست، لطفاً ساعت دیگری انتخاب کنید' }, { status: 409 });
    }

    // اسنپ‌شات خدمات — اگر سالن‌دار بعداً قیمت/مدت‌زمان را عوض کند، این نوبت ثابت می‌ماند
    const servicesSnapshot = items.map((i) => ({
      name: i.name,
      price: i.price ?? undefined,
      duration: i.durationMinutes,
    }));

    const depositAmount = category.depositAmount || 0;
    const totalAmount = depositAmount + BOOKING_APP_FEE;

    const booking = await prisma.booking.create({
      data: {
        salonId,
        customerId: decoded.userId,
        customerName: customerName?.trim() || null,
        customerPhone,
        date: parsedDate,
        startTime,
        services: servicesSnapshot,
        depositAmount,
        appFee: BOOKING_APP_FEE,
        totalAmount,
        source: 'ONLINE',
      },
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating online booking:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت نوبت' }, { status: 500 });
  }
}