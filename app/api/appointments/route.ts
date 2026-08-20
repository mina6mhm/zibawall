// app/api/appointments/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function GET() {
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

    const groups = await prisma.bookingGroup.findMany({
      where: { customerId: decoded.userId, paymentStatus: 'SUCCESS' },
      orderBy: { createdAt: 'desc' },
      include: {
        salon: { select: { id: true, name: true, imageUrl: true, address: true } },
        bookings: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
      },
    });

    // نوبت‌های قدیمی که گروه ندارند — فقط قطعی‌شده‌ها یا لغو‌شده‌ها
    const ungroupedBookings = await prisma.booking.findMany({
      where: {
        customerId: decoded.userId,
        bookingGroupId: null,
        status: { in: ['CONFIRMED', 'CANCELLED'] },
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: { salon: { select: { id: true, name: true, imageUrl: true, address: true } } },
    });

    // هر نوبت status خودش رو داره — وضعیت گروه از روی اولین نوبت تعیین نمیشه
    const mapItem = (b: any) => ({
      id: b.id,
      date: b.date,
      startTime: b.startTime,
      status: b.status, // ← status هر نوبت جداگانه
      services: Array.isArray(b.services)
        ? (b.services as any[]).map((s) => ({ name: s.name, price: s.price, staffName: s.staffName }))
        : [],
    });

    // وضعیت کلی گروه: اگه همه لغو شده باشن → CANCELLED، وگرنه → وضعیت واقعی
    const resolveGroupStatus = (bookings: any[]) => {
      if (bookings.length === 0) return 'CONFIRMED';
      const allCancelled = bookings.every((b) => b.status === 'CANCELLED');
      if (allCancelled) return 'CANCELLED';
      // اگه حداقل یکی CONFIRMED هست، گروه CONFIRMED محسوب میشه
      return 'CONFIRMED';
    };

    const groupedAppointments = groups.map((g) => ({
      id: g.id,
      isGroup: true,
      salon: g.salon,
      status: resolveGroupStatus(g.bookings),
      paymentStatus: g.paymentStatus,
      totalDeposit: g.totalDeposit,
      appFee: g.appFee,
      totalAmount: g.totalAmount,
      items: g.bookings.map(mapItem), // هر آیتم status خودش رو داره
    }));

    const singleAppointments = ungroupedBookings.map((b) => ({
      id: b.id,
      isGroup: false,
      salon: b.salon,
      status: b.status,
      paymentStatus: b.paymentStatus,
      totalDeposit: b.depositAmount,
      appFee: b.appFee,
      totalAmount: b.totalAmount,
      items: [mapItem(b)],
    }));

    const appointments = [...groupedAppointments, ...singleAppointments].sort((a, b) => {
      const aDate = a.items[0]?.date ?? '';
      const bDate = b.items[0]?.date ?? '';
      return new Date(bDate as any).getTime() - new Date(aDate as any).getTime();
    });

    return NextResponse.json({ appointments }, { status: 200 });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت نوبت‌ها' }, { status: 500 });
  }
}