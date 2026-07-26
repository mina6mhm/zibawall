//app/api/appointment/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEPOSIT_AMOUNT = 20000; // مبلغ ثابت و غیرقابل ویرایش بابت ثبت نوبت

const toEnglishDigits = (value: string) => {
  const persian = '۰۱۲۳۴۵۶۷۸۹';
  const arabic = '٠١٢٣٤٥٦٧٨٩';
  return String(value)
    .split('')
    .map((ch) => {
      const p = persian.indexOf(ch);
      if (p !== -1) return String(p);
      const a = arabic.indexOf(ch);
      if (a !== -1) return String(a);
      return ch;
    })
    .join('');
};
const sanitizeNumber = (value: any) => Number(toEnglishDigits(String(value ?? '')).replace(/[^0-9]/g, '')) || 0;

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

// action=finalize → ثبت جزئیات نهایی نوبت توسط سالن‌دار
// action=cancel   → لغو نوبت
// action=hide     → حذف یک‌طرفه‌ی گفتگو (فقط برای بیننده‌ی فعلی)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone, action, visitDate, checkInTime, checkOutTime, services } = body;

    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const result = await loadAppointmentWithAccess(userPhone, id);
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

    const { appointment, isSalonOwner } = result;

    if (action === 'hide') {
      const field = isSalonOwner ? 'hiddenForSalon' : 'hiddenForCustomer';
      const updated = await prisma.appointment.update({
        where: { id },
        data: { [field]: true },
      });
      return NextResponse.json({ appointment: updated });
    }

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
        return NextResponse.json({ error: 'تاریخ و حداقل یک آیتم الزامی است.' }, { status: 400 });
      }

      // قیمت اختیاریه؛ فقط نام آیتم الزامیه
      const cleanedServices = services
        .filter((s: any) => s.name?.trim())
        .map((s: any) => ({ name: s.name.trim(), price: sanitizeNumber(s.price) }));

      if (cleanedServices.length === 0) {
        return NextResponse.json({ error: 'حداقل یک آیتم معتبر لازم است.' }, { status: 400 });
      }

      const totalAmount = cleanedServices.reduce((sum: number, s: any) => sum + s.price, 0);

      // مبلغ بیعانه همیشه ثابت و سمت سرور تعیین می‌شود؛ ورودی کاربر برای این مقدار نادیده گرفته می‌شود
      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          visitDate: new Date(visitDate),
          checkInTime: checkInTime || null,
          checkOutTime: checkOutTime || null,
          services: cleanedServices,
          totalAmount,
          depositAmount: DEPOSIT_AMOUNT,
          status: 'AWAITING_PAYMENT',
        },
      });

      await prisma.appointmentMessage.create({
        data: {
          appointmentId: id,
          sender: 'SALON',
          message: 'جزئیات نوبت ثبت شد. برای قطعی‌شدن نوبت، لینک پرداخت را دنبال کنید.',
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