// app/api/booking-category/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// دریافت همه‌ی دسته‌ها به همراه ریزخدمات‌شان
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');
    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    const categories = await prisma.bookingCategory.findMany({
      where: { salonId: salon.id },
      include: { services: { orderBy: { order: 'asc' } }, staff: { select: { id: true, name: true } } },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching booking categories:', error);
    return NextResponse.json({ error: 'خطا در دریافت دسته‌بندی‌ها' }, { status: 500 });
  }
}

// افزودن دسته‌ی جدید (نام کاملاً دلخواه سالن‌دار)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userPhone, name } = body;

    if (!userPhone || !name?.trim()) {
      return NextResponse.json({ error: 'نام دسته و شماره کاربر الزامی است.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    const existing = await prisma.bookingCategory.findFirst({
      where: { salonId: salon.id, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'دسته‌ای با این نام قبلاً ثبت شده است.' }, { status: 409 });
    }

    const count = await prisma.bookingCategory.count({ where: { salonId: salon.id } });

    const category = await prisma.bookingCategory.create({
      data: { name: name.trim(), salonId: salon.id, order: count },
      include: { services: true, staff: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking category:', error);
    return NextResponse.json({ error: 'خطا در ثبت دسته‌بندی' }, { status: 500 });
  }
}