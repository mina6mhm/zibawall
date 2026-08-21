// app/api/booking/[id]/cancel/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { getSalonForUserId } from '@/lib/salonAccess';

// لغو یک نوبت توسط سالن‌دار — status به CANCELLED تغییر می‌کند
// (نه حذف کامل، تا سابقه‌ی حسابداری/تاریخچه از بین نرود)
// به محض لغو، آن ساعت بلافاصله برای رزرو جدید آزاد می‌شود، چون فیلتر
// تداخل نوبت‌ها فقط CONFIRMED و PENDING_PAYMENT معتبر را مسدود می‌داند.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    const salon = await getSalonForUserId(decoded.userId);
    if (!salon) return NextResponse.json({ error: 'شما سالنی ثبت نکرده‌اید' }, { status: 404 });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.salonId !== salon.id) {
      return NextResponse.json({ error: 'نوبتی یافت نشد' }, { status: 404 });
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json({ error: 'این نوبت قبلاً لغو شده است' }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({ success: true, booking: updated }, { status: 200 });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'خطای سرور در لغو نوبت' }, { status: 500 });
  }
}