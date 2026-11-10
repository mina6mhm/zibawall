// app/api/staff/bookings/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { parseDayRange, dateWhere, MAX_BOOKING_ROWS } from '@/lib/dateRange';

export const dynamic = 'force-dynamic';

// نوبت‌های قطعی‌شده‌ی یک پرسنل خاص — فقط وقتی شماره‌ی موبایل کاربر لاگین‌شده
// با شماره‌ی ثبت‌شده‌ی همان رکورد Staff یکسان باشد (بررسی امنیتی)
export async function GET(req: Request) {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    if (!staffId) return NextResponse.json({ error: 'staffId الزامی است' }, { status: 400 });

    // بازه‌ی تاریخ (?from=&to=)؛ قبلاً همه‌ی تاریخچه‌ی نوبت‌های سالن خوانده می‌شد
    const range = parseDayRange(searchParams);
    if ('error' in range) return NextResponse.json({ error: range.error }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { phone: true } });
    if (!user?.phone) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 403 });

    const staffMember = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staffMember || staffMember.phone !== user.phone) {
      return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 403 });
    }

    // برخلاف قبل، وضعیت نوبت رو هم لازم داریم (برای نمایش بج وضعیت روی کارت)
    // پس دیگه فیلتر status:'CONFIRMED' رو توی کوئری نمی‌زنیم، بلکه بعداً
    // خودمون بر اساس نیاز فیلتر می‌کنیم (فعلاً همون CONFIRMED رو نگه می‌داریم
    // که رفتار قبلی عوض نشه، ولی این‌بار از فیلد status خودِ booking می‌خونیم)
    const bookings = await prisma.booking.findMany({
      where: { salonId: staffMember.salonId, status: 'CONFIRMED', date: dateWhere(range) },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      take: MAX_BOOKING_ROWS,
    });

    // فقط نوبت‌هایی که حداقل یکی از خدمات‌شان به همین پرسنل تخصیص دارد
    const servicesOf = (b: { services: unknown }): any[] => (Array.isArray(b.services) ? b.services : []);
    const isMine = (sv: any) => sv?.staffId === staffId || sv?.staffName === staffMember.name;

    const result = bookings
      .filter((b) => servicesOf(b).some(isMine))
      .map((b) => ({
        id: b.id,
        date: b.date,
        startTime: b.startTime,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        status: b.status,
        services: servicesOf(b)
          .filter(isMine)
          .map((sv) => ({
            name: sv.name,
            price: sv.price,
            durationMin: sv.durationMin,
            staffName: sv.staffName,
            staffPercentage: sv.staffPercentage,
          })),
        bookingGroupId: b.bookingGroupId,
      }));

    return NextResponse.json({ bookings: result, staffName: staffMember.name });
  } catch (error) {
    console.error('Error fetching staff bookings:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}