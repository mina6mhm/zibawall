// app/api/booking-services/public/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// نسخه‌ی عمومی و بدون نیاز به لاگین — فقط خدمات فعال یک سالن، برای صفحه‌ی رزرو مشتری
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId الزامی است' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon || !salon.bookingEnabled) {
      return NextResponse.json({ services: [] });
    }

    const services = await prisma.bookingService.findMany({
      where: { salonId, isActive: true },
      select: {
        id: true,
        name: true,
        durationMin: true,
        price: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ services });
  } catch (error) {
    console.error('Error fetching public booking services:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}