//app/api/appointment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// شروع یک گفتگوی نوبت‌دهی جدید — فقط وقتی پیام اول ارسال شده باشد ساخته می‌شود
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerPhone, salonId, firstMessage } = body;

    if (!customerPhone || !salonId) {
      return NextResponse.json({ error: 'شماره مشتری و شناسه سالن الزامی است.' }, { status: 400 });
    }
    if (!firstMessage?.trim()) {
      return NextResponse.json({ error: 'برای شروع نوبت، ارسال یک پیام الزامی است.' }, { status: 400 });
    }

    const customer = await prisma.user.findUnique({ where: { phone: customerPhone } });
    if (!customer) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon) return NextResponse.json({ error: 'سالن یافت نشد.' }, { status: 404 });

    // اگر گفتگوی باز (هنوز قطعی/لغو نشده) با همین سالن وجود دارد، همان را برگردان
    const existing = await prisma.appointment.findFirst({
      where: {
        customerId: customer.id,
        salonId,
        status: { in: ['NEGOTIATING', 'AWAITING_PAYMENT'] },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existing) {
      return NextResponse.json({ appointment: existing }, { status: 200 });
    }

    const appointment = await prisma.appointment.create({
      data: {
        customerId: customer.id,
        salonId,
        messages: { create: [{ message: firstMessage.trim(), sender: 'CUSTOMER' }] },
      },
    });

    return NextResponse.json({ appointment }, { status: 201 });
  } catch (error) {
    console.error('Error creating appointment:', error);
    return NextResponse.json({ error: 'خطا در ایجاد نوبت' }, { status: 500 });
  }
}

// دریافت لیست نوبت‌ها
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');
    const userPhone = searchParams.get('userPhone');
    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    if (scope === 'customer') {
      const appointments = await prisma.appointment.findMany({
        where: { customerId: user.id, hiddenForCustomer: false },
        include: { salon: { select: { id: true, name: true, imageUrl: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      return NextResponse.json({ appointments });
    }

    if (scope === 'salon') {
      const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
      if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

      const appointments = await prisma.appointment.findMany({
        where: { salonId: salon.id, hiddenForSalon: false },
        include: { customer: { select: { name: true, phone: true } } },
        orderBy: { updatedAt: 'desc' },
      });
      return NextResponse.json({ appointments });
    }

    return NextResponse.json({ error: 'scope نامعتبر است.' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'خطا در دریافت نوبت‌ها' }, { status: 500 });
  }
}