// app/api/appointments/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// سقف تعداد نتایج: کاربری با سابقه‌ی طولانی (یا ربات) نباید کل جدول را یک‌جا بکشد
const MAX_ITEMS = 200;

export async function GET() {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const [groups, ungroupedBookings] = await Promise.all([
      prisma.bookingGroup.findMany({
        where: { customerId: auth.userId, paymentStatus: 'SUCCESS' },
        orderBy: { createdAt: 'desc' },
        take: MAX_ITEMS,
        include: {
          salon: { select: { id: true, name: true, imageUrl: true, address: true } },
          bookings: { orderBy: [{ date: 'asc' }, { startTime: 'asc' }] },
        },
      }),
      // نوبت‌های قدیمی که گروه ندارند — فقط قطعی‌شده‌ها یا لغو‌شده‌ها
      prisma.booking.findMany({
        where: {
          customerId: auth.userId,
          bookingGroupId: null,
          status: { in: ['CONFIRMED', 'CANCELLED'] },
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
        take: MAX_ITEMS,
        include: { salon: { select: { id: true, name: true, imageUrl: true, address: true } } },
      }),
    ]);

    // هر نوبت status خودش رو داره — وضعیت گروه از روی اولین نوبت تعیین نمیشه
    const mapItem = (b: any) => ({
      id: b.id,
      date: b.date,
      startTime: b.startTime,
      status: b.status,
      services: Array.isArray(b.services)
        ? (b.services as any[]).map((s) => ({ name: s.name, price: s.price, staffName: s.staffName }))
        : [],
    });

    // وضعیت کلی گروه: اگه همه لغو شده باشن → CANCELLED، وگرنه → CONFIRMED
    const resolveGroupStatus = (bookings: any[]) => {
      if (bookings.length === 0) return 'CONFIRMED';
      return bookings.every((b) => b.status === 'CANCELLED') ? 'CANCELLED' : 'CONFIRMED';
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
      items: g.bookings.map(mapItem),
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

    const time = (a: { items: { date?: unknown }[] }) => {
      const t = new Date((a.items[0]?.date ?? '') as any).getTime();
      return Number.isNaN(t) ? 0 : t;
    };
    const appointments = [...groupedAppointments, ...singleAppointments].sort(
      (a, b) => time(b) - time(a)
    );

    return NextResponse.json({ appointments }, { status: 200 });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت نوبت‌ها' }, { status: 500 });
  }
}