// app/api/booking-service/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// افزودن ریزخدمت جدید داخل یک دسته
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userPhone, categoryId, name, durationMinutes, price } = body;

    if (!userPhone || !categoryId || !name?.trim() || !durationMinutes) {
      return NextResponse.json({ error: 'نام، دسته، و مدت‌زمان الزامی است.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

    const category = await prisma.bookingCategory.findUnique({ where: { id: categoryId } });
    if (!category || category.salonId !== salon.id) {
      return NextResponse.json({ error: 'دسته‌بندی یافت نشد.' }, { status: 404 });
    }

    const duration = Number(durationMinutes);
    if (!duration || duration <= 0) {
      return NextResponse.json({ error: 'مدت‌زمان باید عددی بزرگ‌تر از صفر باشد.' }, { status: 400 });
    }

    const existing = await prisma.bookingService.findFirst({
      where: { categoryId, name: name.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'ریزخدمتی با این نام قبلاً در این دسته ثبت شده است.' }, { status: 409 });
    }

    const count = await prisma.bookingService.count({ where: { categoryId } });

    const service = await prisma.bookingService.create({
      data: {
        name: name.trim(),
        durationMinutes: duration,
        price: price ? Number(price) : null,
        categoryId,
        salonId: salon.id,
        order: count,
      },
    });

    return NextResponse.json({ service }, { status: 201 });
  } catch (error) {
    console.error('Error creating booking service:', error);
    return NextResponse.json({ error: 'خطا در ثبت ریزخدمت' }, { status: 500 });
  }
}