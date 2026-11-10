// app/api/staff/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getSalonForUserId } from '@/lib/salonAccess';
import { normalizeDigits } from '@/lib/phone';
import { cleanString } from '@/lib/validate';

const mobileRegex = /^09\d{9}$/;
const MAX_STAFF_PER_SALON = 200;
const MAX_STAFF_NAME_LENGTH = 60;

// گرفتن سالنی که کاربر لاگین‌شده به آن دسترسی دارد (صاحب اصلی یا مدیر اضافه‌شده)
async function getOwnedSalonFromToken() {
  const auth = await getAuthUser();
  if ('error' in auth) return { error: auth.error, status: auth.status };

  const salon = await getSalonForUserId(auth.userId);

  if (!salon) return { error: 'شما سالنی ثبت نکرده‌اید', status: 404 as const };

  return { salon };
}

// دریافت لیست پرسنل سالنِ کاربر لاگین‌شده
export async function GET() {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const staff = await prisma.staff.findMany({
      where: { salonId: result.salon.id },
      include: { bookingServices: true },
      orderBy: { name: 'asc' },
      take: MAX_STAFF_PER_SALON,
    });

    return NextResponse.json({ staff }, { status: 200 });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت پرسنل' }, { status: 500 });
  }
}

// افزودن پرسنل جدید (اسم + شماره موبایل)
export async function POST(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    // بدن نامعتبر قبلاً ۵۰۰ می‌داد؛ ارقام فارسی هم قبلاً «شماره نامعتبر» می‌شد
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'اطلاعات ارسالی نامعتبر است' }, { status: 400 });
    }
    const name = cleanString(body.name, MAX_STAFF_NAME_LENGTH) ?? '';
    const phone = normalizeDigits(body.phone);

    if (!name) {
      return NextResponse.json({ error: 'نام پرسنل را وارد کنید (حداکثر ۶۰ کاراکتر)' }, { status: 400 });
    }

    if (!mobileRegex.test(phone)) {
      return NextResponse.json({ error: 'شماره موبایل پرسنل معتبر نیست' }, { status: 400 });
    }

    // درصد پرسنل کاملاً اختیاریه؛ اگه ارسال بشه باید عددی بین ۰ تا ۱۰۰ باشه
    let commissionPercent: number | null = null;
    if (body?.commissionPercent !== undefined && body?.commissionPercent !== null && body?.commissionPercent !== '') {
      const n = Number(body.commissionPercent);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        return NextResponse.json({ error: 'درصد پرسنل باید عددی بین ۰ تا ۱۰۰ باشد' }, { status: 400 });
      }
      commissionPercent = n;
    }

    const existingName = await prisma.staff.findUnique({
      where: { salonId_name: { salonId: result.salon.id, name } },
    });

    if (existingName) {
      return NextResponse.json({ error: 'این پرسنل قبلاً ثبت شده است' }, { status: 400 });
    }

    const existingPhone = await prisma.staff.findUnique({
      where: { salonId_phone: { salonId: result.salon.id, phone } },
    });

    if (existingPhone) {
      return NextResponse.json({ error: 'این شماره موبایل قبلاً برای پرسنل دیگری ثبت شده است' }, { status: 400 });
    }

    const staffCount = await prisma.staff.count({ where: { salonId: result.salon.id } });
    if (staffCount >= MAX_STAFF_PER_SALON) {
      return NextResponse.json({ error: 'سقف تعداد پرسنل این سالن پر شده است' }, { status: 400 });
    }

    const staff = await prisma.staff.create({
      data: { salonId: result.salon.id, name, phone, commissionPercent },
    });

    return NextResponse.json({ success: true, staff }, { status: 201 });
  } catch (error) {
    // دو درخواست هم‌زمان: بررسی تکراری‌بودن بالا و create اتمیک نیستند؛ یکتایی را دیتابیس تضمین می‌کند
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'این پرسنل (نام یا شماره) قبلاً ثبت شده است' }, { status: 409 });
    }
    console.error('Error creating staff:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت پرسنل' }, { status: 500 });
  }
}

// حذف پرسنل
export async function DELETE(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'آیدی پرسنل ارسال نشده است' }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({ where: { id } });

    if (!staff || staff.salonId !== result.salon.id) {
      return NextResponse.json({ error: 'پرسنلی یافت نشد' }, { status: 404 });
    }

    // deleteMany: اگر هم‌زمان حذف شده باشد، خطای P2025 (۵۰۰) نمی‌دهد
    await prisma.staff.deleteMany({ where: { id, salonId: result.salon.id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف پرسنل' }, { status: 500 });
  }
}