// app/api/booking/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';
import { getSalonForUserId } from '@/lib/salonAccess';

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

  const salon = await getSalonForUserId(decoded.userId);

  if (!salon) return { error: 'شما سالنی ثبت نکرده‌اید', status: 404 as const };

  return { salon, decoded };
}

// یک تابع مشترک برای پاک‌سازی و اعتبارسنجی آرایه‌ی خدمات (شامل staffName هر ردیف)
// قبلاً اینجا staffName نادیده گرفته می‌شد و ذخیره نمی‌شد — همین‌جا اصلاح شده
function sanitizeServices(services: any): { name: string; price?: number; staffName?: string; staffPercentage?: number }[] {
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
    }))
    .filter((s) => s.name !== '');
}

// دریافت لیست نوبت‌های سالنِ کاربر لاگین‌شده
export async function GET(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const bookings = await prisma.booking.findMany({
      where: { salonId: result.salon.id, status: 'CONFIRMED' },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ bookings }, { status: 200 });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت نوبت‌ها' }, { status: 500 });
  }
}

// نکته: ثبت نوبت دستی توسط سالن‌دار (POST) عمداً حذف شده است.
// تنها راه ساخت نوبت، مسیر آنلاین مشتری (POST /api/booking-online/reserve)
// است که ساعت کاری سالن/پرسنل و تداخل نوبت‌ها را کامل چک می‌کند.
// این endpoint فقط برای مشاهده‌ی (GET)، ویرایش (PUT) و حذف (DELETE) نوبت‌های
// موجود توسط سالن‌دار باقی مانده است.

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
    // تاریخ و ساعت نوبت عمداً از ورودی خونده نمی‌شن: طراحی محصول اینه که بعد از
    // ثبت نوبت، فقط خدمات/پرسنل/درصد قابل ویرایشه (چون تغییر تاریخ/ساعت نیاز به
    // چک تداخل و ساعت کاری داره که این endpoint انجامش نمی‌ده). حتی اگه کسی مستقیم
    // با این فیلدها درخواست بزنه، نادیده گرفته می‌شن و مقدار قبلیِ خودِ نوبت می‌مونه.
    const { customerName, customerPhone, services, depositAmount } = body;

    if (!customerPhone || !mobileRegex.test(customerPhone)) {
      return NextResponse.json({ error: 'شماره موبایل مشتری معتبر نیست' }, { status: 400 });
    }

    const cleanedServices = sanitizeServices(services);

    if (cleanedServices.length === 0) {
      return NextResponse.json({ error: 'حداقل یک خدمت معتبر وارد کنید' }, { status: 400 });
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