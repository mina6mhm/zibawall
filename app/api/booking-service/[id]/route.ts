// app/api/booking-service/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyOwnership(userPhone: string, serviceId: string) {
  const user = await prisma.user.findUnique({ where: { phone: userPhone } });
  if (!user) return { error: 'کاربر یافت نشد.', status: 404 } as const;

  const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
  if (!salon) return { error: 'کسب‌وکاری یافت نشد.', status: 404 } as const;

  const service = await prisma.bookingService.findUnique({ where: { id: serviceId } });
  if (!service || service.salonId !== salon.id) {
    return { error: 'ریزخدمت یافت نشد.', status: 404 } as const;
  }

  return { salon, service };
}

// ویرایش ریزخدمت
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone, name, durationMinutes, price } = body;

    if (!userPhone || !name?.trim() || !durationMinutes) {
      return NextResponse.json({ error: 'نام و مدت‌زمان الزامی است.' }, { status: 400 });
    }

    const check = await verifyOwnership(userPhone, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    const duration = Number(durationMinutes);
    if (!duration || duration <= 0) {
      return NextResponse.json({ error: 'مدت‌زمان باید عددی بزرگ‌تر از صفر باشد.' }, { status: 400 });
    }

    const duplicate = await prisma.bookingService.findFirst({
      where: { categoryId: check.service.categoryId, name: name.trim(), NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'ریزخدمتی با این نام قبلاً ثبت شده است.' }, { status: 409 });
    }

    const service = await prisma.bookingService.update({
      where: { id },
      data: {
        name: name.trim(),
        durationMinutes: duration,
        price: price ? Number(price) : null,
      },
    });

    return NextResponse.json({ service });
  } catch (error) {
    console.error('Error updating service:', error);
    return NextResponse.json({ error: 'خطا در ویرایش ریزخدمت' }, { status: 500 });
  }
}

// حذف ریزخدمت
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');

    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const check = await verifyOwnership(userPhone, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    await prisma.bookingService.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting service:', error);
    return NextResponse.json({ error: 'خطا در حذف ریزخدمت' }, { status: 500 });
  }
}