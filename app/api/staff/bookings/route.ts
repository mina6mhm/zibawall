// app/api/staff/bookings/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// نوبت‌های قطعی‌شده‌ی یک پرسنل خاص — فقط وقتی شماره‌ی موبایل کاربر لاگین‌شده
// با شماره‌ی ثبت‌شده‌ی همان رکورد Staff یکسان باشد (بررسی امنیتی)
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get('staffId');
    if (!staffId) return NextResponse.json({ error: 'staffId الزامی است' }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user?.phone) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 403 });

    const staffMember = await prisma.staff.findUnique({ where: { id: staffId } });
    if (!staffMember || staffMember.phone !== user.phone) {
      return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 403 });
    }

    const bookings = await prisma.booking.findMany({
      where: { salonId: staffMember.salonId, status: 'CONFIRMED' },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    // فقط نوبت‌هایی که حداقل یکی از خدمات‌شان به همین پرسنل تخصیص دارد
    const isMine = (sv: any) => sv.staffId === staffId || sv.staffName === staffMember.name;

    const result = bookings
      .filter((b) => (b.services as any[]).some(isMine))
      .map((b) => ({
        id: b.id,
        date: b.date,
        startTime: b.startTime,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        services: (b.services as any[])
          .filter(isMine)
          .map((sv) => ({ name: sv.name, price: sv.price, durationMin: sv.durationMin })),
        bookingGroupId: b.bookingGroupId,
      }));

    return NextResponse.json({ bookings: result, staffName: staffMember.name });
  } catch (error) {
    console.error('Error fetching staff bookings:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}