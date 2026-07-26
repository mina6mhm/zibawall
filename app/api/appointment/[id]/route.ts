//app/api/appointment/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function loadAppointmentWithAccess(userPhone: string, appointmentId: string) {
  const user = await prisma.user.findUnique({ where: { phone: userPhone } });
  if (!user) return { error: 'کاربر یافت نشد.', status: 404 } as const;

  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      salon: { select: { id: true, name: true, imageUrl: true, userId: true } },
      customer: { select: { id: true, name: true, phone: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  });
  if (!appointment) return { error: 'نوبت یافت نشد.', status: 404 } as const;

  const isCustomer = appointment.customerId === user.id;
  const isSalonOwner = appointment.salon.userId === user.id;
  if (!isCustomer && !isSalonOwner) {
    return { error: 'دسترسی ندارید.', status: 403 } as const;
  }

  return { appointment, isCustomer, isSalonOwner, user };
}

// دریافت جزئیات نوبت + پیام‌ها
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');
    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const result = await loadAppointmentWithAccess(userPhone, id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    return NextResponse.json({
      appointment: result.appointment,
      viewerRole: result.isSalonOwner ? 'SALON' : 'CUSTOMER',
    });
  } catch (error) {
    console.error('Error fetching appointment:', error);
    return NextResponse.json({ error: 'خطا در دریافت نوبت' }, { status: 500 });
  }
}

// action=finalize → ثبت جزئیات نهایی نوبت توسط سالن‌دار (تاریخ، ساعت، خدمات) و انتقال به «منتظر پرداخت»
// action=cancel   → لغو نوبت توسط هرکدام از طرفین
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone, action, visitDate, checkInTime, checkOutTime, services, depositAmount } = body;

    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const result = await loadAppointmentWithAccess(userPhone, id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const { appointment, isSalonOwner } = result;

    if (action === 'cancel') {
      const updated = await prisma.appointment.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      return NextResponse.json({ appointment: updated });
    }

    if (action === 'finalize') {
      if (!isSalonOwner) {
        return NextResponse.json({ error: 'فقط سالن‌دار می‌تواند جزئیات نوبت را نهایی کند.' }, { status: 403 });
      }
      if (appointment.status === 'CONFIRMED') {
        return NextResponse.json({ error: 'این نوبت قبلاً قطعی شده و قابل ویرایش نیست.' }, { status: 400 });
      }
      if (!visitDate || !Array.isArray(services) || services.length === 0) {
        return NextResponse.json({ error: 'تاریخ و حداقل یک خدمت الزامی است.' }, { status: 400 });
      }

      const cleanedServices = services
        .filter((s: any) => s.name?.trim() && Number(s.price) > 0)
        .map((s: any) => ({ name: s.name.trim(), price: Number(s.price) }));

      if (cleanedServices.length === 0) {
        return NextResponse.json({ error: 'حداقل یک خدمت معتبر لازم است.' }, { status: 400 });
      }

      const totalAmount = cleanedServices.reduce((sum: number, s: any) => sum + s.price, 0);

      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          visitDate: new Date(visitDate),
          checkInTime: checkInTime || null,
          checkOutTime: checkOutTime || null,
          services: cleanedServices,
          totalAmount,
          depositAmount: depositAmount ? Number(depositAmount) : appointment.depositAmount,
          status: 'AWAITING_PAYMENT',
        },
      });

      await prisma.appointmentMessage.create({
        data: {
          appointmentId: id,
          sender: 'SALON',
          message: 'جزئیات نوبت ثبت شد. برای قطعی‌شدن نوبت، لینک پرداخت بیعانه را دنبال کنید.',
        },
      });

      return NextResponse.json({ appointment: updated });
    }

    return NextResponse.json({ error: 'action نامعتبر است.' }, { status: 400 });
  } catch (error) {
    console.error('Error updating appointment:', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی نوبت' }, { status: 500 });
  }
}
