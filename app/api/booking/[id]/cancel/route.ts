// app/api/booking/[id]/cancel/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getSalonForUserId } from '@/lib/salonAccess';

// لغو یک نوبت توسط سالن‌دار — status به CANCELLED تغییر می‌کند
// (نه حذف کامل، تا سابقه‌ی حسابداری/تاریخچه از بین نرود)
// به محض لغو، آن ساعت بلافاصله برای رزرو جدید آزاد می‌شود.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const salon = await getSalonForUserId(auth.userId);
    if (!salon) return NextResponse.json({ error: 'شما سالنی ثبت نکرده‌اید' }, { status: 404 });

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking || booking.salonId !== salon.id) {
      return NextResponse.json({ error: 'نوبتی یافت نشد' }, { status: 404 });
    }

    // تغییر وضعیت اتمیک (دوبار کلیک / دو دستگاه هم‌زمان)
    const result = await prisma.booking.updateMany({
      where: { id, salonId: salon.id, status: { not: 'CANCELLED' } },
      data: { status: 'CANCELLED' },
    });

    if (result.count === 0) {
      return NextResponse.json({ error: 'این نوبت قبلاً لغو شده است' }, { status: 400 });
    }

    const updated = await prisma.booking.findUnique({ where: { id } });

    return NextResponse.json(
      {
        success: true,
        booking: updated,
        // اگر نوبت پرداخت‌شده بوده، استرداد بیعانه باید دستی/از طریق پشتیبانی پیگیری شود
        needsRefund: booking.paymentStatus === 'SUCCESS',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: 'خطای سرور در لغو نوبت' }, { status: 500 });
  }
}