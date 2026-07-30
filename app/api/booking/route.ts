// app/api/booking/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';
import { BOOKING_APP_FEE } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const mobileRegex = /^09\d{9}$/;

// گرفتن سالن متعلق به کاربر لاگین‌شده از روی توکن
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

// ساخت نوبت جدید توسط سالن‌دار (پس از توافق تلفنی/واتساپ/تلگرام با مشتری)
export async function POST(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { salon } = result;

    const body = await req.json();
    const {
      customerName,
      customerPhone,
      date,
      startTime,
      services,
      staffName,
      depositAmount,
    } = body;

    if (!customerPhone || !mobileRegex.test(customerPhone)) {
      return NextResponse.json({ error: 'شماره موبایل مشتری معتبر نیست' }, { status: 400 });
    }

    if (!date || !startTime) {
      return NextResponse.json({ error: 'تاریخ و ساعت نوبت الزامی است' }, { status: 400 });
    }

    if (!Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ error: 'حداقل یک خدمت را وارد کنید' }, { status: 400 });
    }

    const cleanedServices = services
      .map((s: any) => ({
        name: typeof s?.name === 'string' ? s.name.trim() : '',
        price: typeof s?.price === 'number' && s.price > 0 ? s.price : undefined,
      }))
      .filter((s: any) => s.name !== '');

    if (cleanedServices.length === 0) {
      return NextResponse.json({ error: 'حداقل یک خدمت معتبر وارد کنید' }, { status: 400 });
    }

    const finalDepositAmount =
      typeof depositAmount === 'number' && depositAmount > 0 ? Math.round(depositAmount) : 0;

    const totalAmount = finalDepositAmount + BOOKING_APP_FEE;

    // اگر شماره‌ی مشتری قبلاً در سیستم ثبت‌نام کرده، به یوزرش لینک می‌شود
    const existingCustomer = await prisma.user.findUnique({
      where: { phone: customerPhone },
    });

    const booking = await prisma.booking.create({
      data: {
        salonId: salon.id,
        customerId: existingCustomer?.id || null,
        customerName: customerName?.trim() || null,
        customerPhone,
        date: new Date(date),
        startTime,
        services: cleanedServices,
        staffName: staffName?.trim() || null,
        depositAmount: finalDepositAmount,
        appFee: BOOKING_APP_FEE,
        totalAmount,
      },
    });

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت نوبت' }, { status: 500 });
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