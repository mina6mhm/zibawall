// app/api/booking/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { timeToMinutes, minutesToTime, rangesOverlap, startOfDay } from '@/lib/bookingSlots';

// دریافت لیست نوبت‌های سالن (برای تب «نوبت‌های سالن»)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');
    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    const bookings = await prisma.booking.findMany({
      where: { salonId: salon.id, status: { not: 'CANCELLED' } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'خطا در دریافت نوبت‌ها' }, { status: 500 });
  }
}

// ثبت نوبت دستی توسط سالن‌دار، یا مسدودسازی یک بازه زمانی
// source: 'MANUAL' (نوبت واقعی با یا بدون مشتری) یا 'BLOCKED' (فقط مسدودسازی زمان)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userPhone,
      source, // 'MANUAL' | 'BLOCKED'
      staffId,
      categoryId,
      serviceId,
      categoryName,
      serviceName,
      durationMinutes,
      price,
      date,
      startTime,
      customerName,
      customerPhone,
    } = body;

    if (!userPhone || !date || !startTime || !durationMinutes) {
      return NextResponse.json({ error: 'اطلاعات ارسالی ناقص است.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    const duration = Number(durationMinutes);
    if (!duration || duration <= 0) {
      return NextResponse.json({ error: 'مدت‌زمان نامعتبر است.' }, { status: 400 });
    }

    const bookingDate = startOfDay(new Date(date));
    const startMin = timeToMinutes(startTime);
    const endMin = startMin + duration;
    const endTime = minutesToTime(endMin);

    // چک تداخل زمانی: فقط وقتی پرسنل مشخص شده باشه معنا داره
    if (staffId) {
      const sameDayBookings = await prisma.booking.findMany({
        where: {
          salonId: salon.id,
          staffId,
          status: { not: 'CANCELLED' },
          date: bookingDate,
        },
      });

      const hasConflict = sameDayBookings.some((b) => {
        const bStart = timeToMinutes(b.startTime);
        const bEnd = timeToMinutes(b.endTime);
        return rangesOverlap(startMin, endMin, bStart, bEnd);
      });

      if (hasConflict) {
        return NextResponse.json({ error: 'این پرسنل در این بازه‌ی زمانی نوبت دیگری دارد.' }, { status: 409 });
      }
    }

    const booking = await prisma.booking.create({
      data: {
        salonId: salon.id,
        source: source === 'BLOCKED' ? 'BLOCKED' : 'MANUAL',
        status: 'CONFIRMED',
        depositStatus: 'SUCCESS', // نوبت دستی/مسدودسازی نیازی به پرداخت آنلاین ندارد
        staffId: staffId || null,
        categoryId: categoryId || null,
        serviceId: serviceId || null,
        categoryName: categoryName || (source === 'BLOCKED' ? 'مسدود شده' : null),
        serviceName: serviceName || (source === 'BLOCKED' ? 'زمان غیرفعال' : null),
        durationMinutes: duration,
        price: price ? Number(price) : null,
        date: bookingDate,
        startTime,
        endTime,
        customerName: customerName?.trim() || null,
        customerPhone: customerPhone?.trim() || null,
      },
    });

    return NextResponse.json({ booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating manual booking:', error);
    return NextResponse.json({ error: 'خطا در ثبت نوبت' }, { status: 500 });
  }
}