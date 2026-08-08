// app/api/staff/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';

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
  include: { bookingServices: true },  // ← اضافه کن
  orderBy: { name: 'asc' },
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

    const body = await req.json();
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';

    if (!name) {
      return NextResponse.json({ error: 'نام پرسنل را وارد کنید' }, { status: 400 });
    }

    if (!mobileRegex.test(phone)) {
      return NextResponse.json({ error: 'شماره موبایل پرسنل معتبر نیست' }, { status: 400 });
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

    const staff = await prisma.staff.create({
      data: { salonId: result.salon.id, name, phone },
    });

    return NextResponse.json({ success: true, staff }, { status: 201 });
  } catch (error) {
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

    await prisma.staff.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف پرسنل' }, { status: 500 });
  }
}