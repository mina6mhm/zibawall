// app/api/booking-online/reserve/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { BOOKING_APP_FEE } from '@/lib/constants';

export async function POST(req: Request) {
  try {
    // ── احراز هویت مشتری ────────────────────────────────────────────────────
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    // ── دریافت و اعتبارسنجی body ────────────────────────────────────────────
    const body = await req.json();
    const { salonId, serviceId, staffId, date, startTime } = body;

    if (!salonId || !serviceId || !date || !startTime) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }

    // ── دریافت اطلاعات سالن و خدمت ──────────────────────────────────────────
    const [salon, service] = await Promise.all([
      prisma.salon.findUnique({ where: { id: salonId } }),
      prisma.bookingService.findUnique({ where: { id: serviceId } }),
    ]);

    if (!salon || !salon.bookingEnabled) {
      return NextResponse.json({ error: 'سیستم نوبت‌دهی این سالن فعال نیست' }, { status: 400 });
    }
    if (!service || service.salonId !== salonId) {
      return NextResponse.json({ error: 'خدمت یافت نشد' }, { status: 404 });
    }

    // ── پیدا کردن پرسنل ─────────────────────────────────────────────────────
    // اگه staffId داده شده → همون پرسنل؛ وگرنه اولین پرسنل آزاد
    let assignedStaff;

    if (staffId) {
      assignedStaff = await prisma.staff.findFirst({
        where: {
          id: staffId,
          salonId,
          bookingServices: { some: { bookingServiceId: serviceId } },
        },
      });
      if (!assignedStaff) {
        return NextResponse.json({ error: 'پرسنل انتخابی برای این خدمت در دسترس نیست' }, { status: 400 });
      }
    } else {
      // بهترین: اولین پرسنلی که این خدمت رو انجام می‌ده
      assignedStaff = await prisma.staff.findFirst({
        where: {
          salonId,
          bookingServices: { some: { bookingServiceId: serviceId } },
        },
        orderBy: { name: 'asc' },
      });
      if (!assignedStaff) {
        return NextResponse.json({ error: 'پرسنل مناسبی یافت نشد' }, { status: 400 });
      }
    }

    // ── بررسی تداخل نوبت ────────────────────────────────────────────────────
    const startMin = startTime.split(':').reduce((h: number, m: string, i: number) =>
      i === 0 ? parseInt(m) * 60 : h + parseInt(m), 0);
    const endMin = startMin + service.durationMin;

    const conflicting = await prisma.booking.findMany({
      where: {
        salonId,
        date: { gte: new Date(date + 'T00:00:00Z'), lt: new Date(date + 'T23:59:59Z') },
        status: { in: ['CONFIRMED', 'PENDING_PAYMENT'] },
      },
    });

    const hasConflict = conflicting.some((b) => {
      const services = b.services as any[];
      const isThisStaff = services.some((sv) => sv.staffId === assignedStaff!.id);
      if (!isThisStaff) return false;

      const bStart = b.startTime.split(':').reduce((h: number, m: string, i: number) =>
        i === 0 ? parseInt(m) * 60 : h + parseInt(m), 0);
      const bDuration = services.reduce((acc: number, sv: any) => acc + (sv.durationMin ?? 60), 0);
      const bEnd = bStart + bDuration;

      return startMin < bEnd && endMin > bStart;
    });

    if (hasConflict) {
      return NextResponse.json({ error: 'این ساعت دیگر در دسترس نیست. لطفاً ساعت دیگری انتخاب کنید.' }, { status: 409 });
    }

    // ── محاسبه مبالغ ─────────────────────────────────────────────────────────
    const depositAmount = service.depositAmount ?? 0;
    const appFee = BOOKING_APP_FEE;
    const totalAmount = depositAmount + appFee;

    // ── ساخت نوبت ───────────────────────────────────────────────────────────
    const booking = await prisma.booking.create({
      data: {
        salonId,
        customerId: user.id,
        customerName: user.name,
        customerPhone: user.phone ?? '',
        date: new Date(date + 'T00:00:00Z'),
        startTime,
        services: [
          {
            name: service.name,
            price: service.price,
            durationMin: service.durationMin,
            staffId: assignedStaff.id,
            staffName: assignedStaff.name,
          },
        ],
        depositAmount,
        appFee,
        totalAmount,
        status: totalAmount > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED',
        paymentStatus: totalAmount > 0 ? 'PENDING' : 'SUCCESS',
      },
      include: { salon: { select: { name: true } } },
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating online booking:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت نوبت' }, { status: 500 });
  }
}