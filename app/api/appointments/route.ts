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

    const bookings = await prisma.booking.findMany({
      where: { customerId: decoded.userId },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
      include: {
        salon: { select: { id: true, name: true, imageUrl: true, address: true } },
      },
    });

    // درصد پرسنل (staffPercentage) عمداً حذف می‌شود؛ مشتری فقط اسم پرسنل و خدمات را می‌بیند
    const appointments = bookings.map((b) => ({
      id: b.id,
      date: b.date,
      startTime: b.startTime,
      services: Array.isArray(b.services)
        ? (b.services as any[]).map((s) => ({ name: s.name, price: s.price, staffName: s.staffName }))
        : [],
      depositAmount: b.depositAmount,
      appFee: b.appFee,
      totalAmount: b.totalAmount,
      status: b.status,
      paymentStatus: b.paymentStatus,
      salon: b.salon,
    }));

    return NextResponse.json({ appointments }, { status: 200 });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت نوبت‌ها' }, { status: 500 });
  }
}