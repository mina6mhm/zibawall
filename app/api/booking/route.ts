// app/api/booking/route.ts
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { normalizeDigits } from '@/lib/phone';
import { getSalonForUserId } from '@/lib/salonAccess';

export const dynamic = 'force-dynamic';

const mobileRegex = /^09\d{9}$/;

const MAX_SERVICES = 30;
const MAX_NAME_LENGTH = 100;
const MAX_AMOUNT = 1_000_000_000; // سقف منطقی مبلغ (تومان)

async function getOwnedSalonFromToken() {
  const auth = await getAuthUser();
  if ('error' in auth) return { error: auth.error, status: auth.status };

  const salon = await getSalonForUserId(auth.userId);
  if (!salon) return { error: 'شما سالنی ثبت نکرده‌اید', status: 404 as const };

  return { salon, userId: auth.userId };
}

// پاک‌سازی و اعتبارسنجی آرایه‌ی خدمات (شامل staffName هر ردیف)
function sanitizeServices(
  services: any
): { name: string; price?: number; staffName?: string; staffPercentage?: number }[] {
  if (!Array.isArray(services)) return [];

  return services
    .slice(0, MAX_SERVICES) // قبلاً آرایه‌ی بی‌نهایت بزرگ ذخیره می‌شد
    .map((s: any) => ({
      name: typeof s?.name === 'string' ? s.name.trim().slice(0, MAX_NAME_LENGTH) : '',
      price:
        typeof s?.price === 'number' && Number.isFinite(s.price) && s.price > 0 && s.price <= MAX_AMOUNT
          ? s.price
          : undefined,
      staffName:
        typeof s?.staffName === 'string' && s.staffName.trim()
          ? s.staffName.trim().slice(0, MAX_NAME_LENGTH)
          : undefined,
      staffPercentage:
        typeof s?.staffPercentage === 'number' && s.staffPercentage > 0 && s.staffPercentage <= 100
          ? s.staffPercentage
          : undefined,
    }))
    .filter((s) => s.name !== '');
}

// دریافت لیست نوبت‌های سالنِ کاربر لاگین‌شده
// ⚠️ این کوئری همه‌ی نوبت‌های CONFIRMED را از ابتدا برمی‌گرداند و با رشد سالن کند می‌شود؛
// بهتر است فیلتر بازه‌ی تاریخ (from/to) اضافه شود (به نوع فیلد date در schema بستگی دارد).
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
// تنها راه ساخت نوبت، مسیر آنلاین مشتری (POST /api/booking-online/reserve) است.

// ویرایش نوبت: فقط خدمات/پرسنل/درصد/مشخصات مشتری (تاریخ و ساعت عمداً قابل ویرایش نیست)
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

    // ویرایش نوبت لغوشده بی‌معناست و تاریخچه‌ی حسابداری را خراب می‌کند
    if (existingBooking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'نوبت لغو شده قابل ویرایش نیست' }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'اطلاعات ارسالی نامعتبر است' }, { status: 400 });
    }

    const { customerName, services, depositAmount } = body as Record<string, any>;
    const customerPhone = normalizeDigits(body.customerPhone);

    if (!customerPhone || !mobileRegex.test(customerPhone)) {
      return NextResponse.json({ error: 'شماره موبایل مشتری معتبر نیست' }, { status: 400 });
    }

    const cleanedServices = sanitizeServices(services);

    if (cleanedServices.length === 0) {
      return NextResponse.json({ error: 'حداقل یک خدمت معتبر وارد کنید' }, { status: 400 });
    }

    // Infinity/NaN/مقدار نجومی قبلاً به خطای دیتابیس یا مبلغ نامعتبر تبدیل می‌شد
    if (
      depositAmount !== undefined &&
      depositAmount !== null &&
      (typeof depositAmount !== 'number' ||
        !Number.isFinite(depositAmount) ||
        depositAmount < 0 ||
        depositAmount > MAX_AMOUNT)
    ) {
      return NextResponse.json({ error: 'مبلغ بیعانه نامعتبر است' }, { status: 400 });
    }

    const finalDepositAmount =
      typeof depositAmount === 'number' && depositAmount > 0 ? Math.round(depositAmount) : 0;

    const totalAmount = finalDepositAmount + existingBooking.appFee;

    const trimmedName = typeof customerName === 'string' ? customerName.trim().slice(0, 100) : '';

    const existingCustomer = await prisma.user.findUnique({
      where: { phone: customerPhone },
      select: { id: true },
    });

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: {
        customerId: existingCustomer?.id || null,
        customerName: trimmedName || null,
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

    // نوبتِ پرداخت‌شده (یا در جریان پرداخت) هرگز فیزیکی حذف نمی‌شود:
    // - سابقه‌ی حسابداری/استرداد از بین می‌رفت
    // - اگر مشتری همان لحظه در درگاه بود، verify نوبت را پیدا نمی‌کرد درحالی‌که پول کم شده
    // به‌جایش «لغو» می‌شود؛ از دید سالن‌دار هم از لیست (فقط CONFIRMED) ناپدید می‌شود.
    if (booking.paymentStatus === 'SUCCESS' || booking.authority) {
      await prisma.booking.updateMany({
        where: { id, salonId: result.salon.id, status: { not: 'CANCELLED' } },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json(
        { success: true, cancelled: true, needsRefund: booking.paymentStatus === 'SUCCESS' },
        { status: 200 }
      );
    }

    await prisma.booking.deleteMany({ where: { id, salonId: result.salon.id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting booking:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف نوبت' }, { status: 500 });
  }
}