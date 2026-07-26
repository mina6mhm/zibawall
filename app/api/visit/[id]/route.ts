//app/api/visit/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type ServiceItem = {
  name: string;
  price: number;
  staffId?: string | null;
  staffName?: string | null;
  staffPercent?: number;
};

async function verifyOwnership(userPhone: string, visitId: string) {
  const user = await prisma.user.findUnique({ where: { phone: userPhone } });
  if (!user) return { error: 'کاربر یافت نشد.', status: 404 } as const;

  const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
  if (!salon) return { error: 'کسب‌وکاری یافت نشد.', status: 404 } as const;

  const visit = await prisma.visit.findUnique({ where: { id: visitId } });
  if (!visit || visit.salonId !== salon.id) {
    return { error: 'مراجعه یافت نشد.', status: 404 } as const;
  }

  return { salon, visit };
}

// ویرایش یک مراجعه
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone, customerPhone, customerName, visitDate, checkInTime, checkOutTime, services } = body;

    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const check = await verifyOwnership(userPhone, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    if (!customerPhone || !visitDate || !Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ error: 'اطلاعات ارسالی ناقص است.' }, { status: 400 });
    }

    const rawServices = services
      .filter((s: any) => s.name?.trim() && Number(s.price) > 0)
      .map((s: any) => ({
        name: s.name.trim(),
        price: Number(s.price),
        staffId: s.staffId || null,
        staffPercent: s.staffPercent ? Number(s.staffPercent) : 0,
      }));

    if (rawServices.length === 0) {
      return NextResponse.json({ error: 'حداقل یک خدمت معتبر لازم است.' }, { status: 400 });
    }

    // نام پرسنل همیشه سمت سرور و بر اساس staffId معتبر resolve می‌شود، نه از ورودی کاربر
    const staffIds = [...new Set(rawServices.map((s) => s.staffId).filter(Boolean))] as string[];
    const staffRecords = staffIds.length
      ? await prisma.staff.findMany({ where: { id: { in: staffIds } } })
      : [];
    const staffMap = new Map(staffRecords.map((s) => [s.id, s.name]));

    const cleanedServices: ServiceItem[] = rawServices.map((s) => ({
      ...s,
      staffName: s.staffId ? staffMap.get(s.staffId) || null : null,
    }));

    const totalAmount = cleanedServices.reduce((sum, s) => sum + s.price, 0);

    const visit = await prisma.visit.update({
      where: { id },
      data: {
        customerPhone: customerPhone.trim(),
        customerName: customerName?.trim() || null,
        visitDate: new Date(visitDate),
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        services: cleanedServices,
        totalAmount,
      },
    });

    return NextResponse.json({ success: true, visit });
  } catch (error) {
    console.error('Error updating visit:', error);
    return NextResponse.json({ error: 'خطا در ویرایش مراجعه' }, { status: 500 });
  }
}

// حذف یک مراجعه
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');

    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const check = await verifyOwnership(userPhone, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    await prisma.visit.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting visit:', error);
    return NextResponse.json({ error: 'خطا در حذف مراجعه' }, { status: 500 });
  }
}

// تغییر دستی وضعیت پرداخت (مثلاً وقتی مشتری نقدی/کارتخوان پرداخت کرده)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone, paymentStatus } = body;

    if (!userPhone || !paymentStatus) {
      return NextResponse.json({ error: 'شماره کاربر و وضعیت پرداخت الزامی است.' }, { status: 400 });
    }
    if (!['PENDING', 'SUCCESS', 'FAILED'].includes(paymentStatus)) {
      return NextResponse.json({ error: 'وضعیت پرداخت نامعتبر است.' }, { status: 400 });
    }

    const check = await verifyOwnership(userPhone, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    const visit = await prisma.visit.update({
      where: { id },
      data: { paymentStatus },
    });

    return NextResponse.json({ success: true, visit });
  } catch (error) {
    console.error('Error updating payment status:', error);
    return NextResponse.json({ error: 'خطا در به‌روزرسانی وضعیت پرداخت' }, { status: 500 });
  }
}
