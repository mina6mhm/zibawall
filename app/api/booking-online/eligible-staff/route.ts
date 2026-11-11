// app/api/booking-online/eligible-staff/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// لیست پرسنلی که یک خدمت خاص را انجام می‌دهند — مستقل از تاریخ،
// برای نمایش در مرحله‌ی «انتخاب پرسنل» قبل از انتخاب تاریخ/ساعت
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const salonId = searchParams.get('salonId');
  const serviceId = searchParams.get('serviceId');

  if (!salonId || !serviceId) {
    return NextResponse.json({ error: 'salonId و serviceId الزامی هستند' }, { status: 400 });
  }

  try {
    const staff = await prisma.staff.findMany({
      where: {
        salonId,
        bookingServices: { some: { bookingServiceId: serviceId } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
      take: 200,
    });

    // کش کوتاه برای CDN/پروکسی (مثل booking-services/public): لیست پرسنل به‌ندرت عوض می‌شود
    return NextResponse.json(
      { staff },
      { headers: { 'Cache-Control': 'public, max-age=10, s-maxage=30, stale-while-revalidate=60' } }
    );
  } catch (error) {
    console.error('Error fetching eligible staff:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}