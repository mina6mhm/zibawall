// app/api/booking-services/public/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PUBLIC_CACHE = { 'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=60' };

// نسخه‌ی عمومی و بدون نیاز به لاگین — فقط خدمات فعال یک سالن، برای صفحه‌ی رزرو مشتری
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId الزامی است' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { bookingEnabled: true },
    });
    if (!salon || !salon.bookingEnabled) {
      return NextResponse.json({ services: [] }, { headers: PUBLIC_CACHE });
    }

    const services = await prisma.bookingService.findMany({
      where: {
        salonId,
        isActive: true,
        // فقط خدماتی که حداقل یک پرسنل انجامشون می‌ده — وگرنه مشتری وارد
        // مرحله‌ی «پرسنل»/«ساعت» می‌شه و به بن‌بست می‌خوره (هیچ پرسنل/اسلاتی نیست)
        staffMembers: { some: {} },
      },
      select: {
        id: true,
        name: true,
        durationMin: true,
        price: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 200,
    });

    return NextResponse.json({ services }, { headers: PUBLIC_CACHE });
  } catch (error) {
    console.error('Error fetching public booking services:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}