//app/api/staff/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// دریافت لیست پرسنل یک سالن
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');
    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    const staff = await prisma.staff.findMany({
      where: { salonId: salon.id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Error fetching staff:', error);
    return NextResponse.json({ error: 'خطا در دریافت پرسنل' }, { status: 500 });
  }
}

// افزودن پرسنل جدید
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userPhone, name } = body;

    if (!userPhone || !name?.trim()) {
      return NextResponse.json({ error: 'نام پرسنل و شماره کاربر الزامی است.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    const existing = await prisma.staff.findFirst({
      where: { salonId: salon.id, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'پرسنلی با این نام قبلاً ثبت شده است.' }, { status: 409 });
    }

    const staff = await prisma.staff.create({
      data: { name: name.trim(), salonId: salon.id },
    });

    return NextResponse.json({ staff }, { status: 201 });
  } catch (error) {
    console.error('Error creating staff:', error);
    return NextResponse.json({ error: 'خطا در ثبت پرسنل' }, { status: 500 });
  }
}

