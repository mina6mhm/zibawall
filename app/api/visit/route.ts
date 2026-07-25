//app/api/visit/route.ts
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

// ثبت مراجعه جدید (سمت سالن)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userPhone, customerPhone, customerName, visitDate, checkInTime, checkOutTime, services } = body;

    if (!userPhone || !customerPhone || !visitDate || !Array.isArray(services) || services.length === 0) {
      return NextResponse.json({ error: 'اطلاعات ارسالی ناقص است.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) return NextResponse.json({ error: 'کسب‌وکاری برای این کاربر یافت نشد.' }, { status: 404 });

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

    // نام پرسنل را سمت سرور و بر اساس staffId معتبر resolve می‌کنیم تا تشابه/اختلاف اسمی رخ ندهد
    const staffIds = [...new Set(rawServices.map((s) => s.staffId).filter(Boolean))] as string[];
    const staffRecords = staffIds.length
      ? await prisma.staff.findMany({ where: { id: { in: staffIds }, salonId: salon.id } })
      : [];
    const staffMap = new Map(staffRecords.map((s) => [s.id, s.name]));

    const cleanedServices: ServiceItem[] = rawServices.map((s) => ({
      ...s,
      staffName: s.staffId ? staffMap.get(s.staffId) || null : null,
    }));

    const totalAmount = cleanedServices.reduce((sum, s) => sum + s.price, 0);

    const visit = await prisma.visit.create({
      data: {
        salonId: salon.id,
        customerPhone: customerPhone.trim(),
        customerName: customerName?.trim() || null,
        visitDate: new Date(visitDate),
        checkInTime: checkInTime || null,
        checkOutTime: checkOutTime || null,
        services: cleanedServices,
        totalAmount,
      },
    });

    return NextResponse.json({ success: true, visit }, { status: 201 });
  } catch (error) {
    console.error('Error creating visit:', error);
    return NextResponse.json({ error: 'خطا در ثبت مراجعه' }, { status: 500 });
  }
}

// دریافت لیست مراجعه‌ها
// scope=salon → همه‌ی اطلاعات (شامل درصد پرسنل) برای صاحب سالن
// scope=customer → اطلاعات بدون درصد پرسنل، برای مشتری
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');

    if (scope === 'salon') {
      const userPhone = searchParams.get('userPhone');
      if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

      const user = await prisma.user.findUnique({ where: { phone: userPhone } });
      if (!user) return NextResponse.json({ error: 'کاربر یافت نشد.' }, { status: 404 });

      const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
      if (!salon) return NextResponse.json({ error: 'کسب‌وکاری یافت نشد.' }, { status: 404 });

      const visits = await prisma.visit.findMany({
        where: { salonId: salon.id },
        orderBy: { visitDate: 'desc' },
      });

      return NextResponse.json({ visits });
    }

    if (scope === 'customer') {
      const customerPhone = searchParams.get('customerPhone');
      if (!customerPhone) return NextResponse.json({ error: 'شماره مشتری الزامی است.' }, { status: 400 });

      const visits = await prisma.visit.findMany({
        where: { customerPhone },
        include: { salon: { select: { name: true } } },
        orderBy: { visitDate: 'desc' },
      });

      // حذف درصد پرسنل و شناسه‌ی پرسنل قبل از ارسال به مشتری
      const sanitized = visits.map((v) => ({
        ...v,
        services: Array.isArray(v.services)
          ? (v.services as any[]).map((s) => ({ name: s.name, price: s.price, staffName: s.staffName }))
          : [],
      }));

      return NextResponse.json({ visits: sanitized });
    }

    return NextResponse.json({ error: 'scope نامعتبر است.' }, { status: 400 });
  } catch (error) {
    console.error('Error fetching visits:', error);
    return NextResponse.json({ error: 'خطا در دریافت مراجعه‌ها' }, { status: 500 });
  }
}

