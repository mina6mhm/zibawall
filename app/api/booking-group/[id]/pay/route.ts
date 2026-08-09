// app/api/booking-group/[id]/pay/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { requestZarinpalPayment } from '@/lib/zarinpal';

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

    const group = await prisma.bookingGroup.findUnique({
      where: { id },
      include: { salon: true },
    });

    if (!group) return NextResponse.json({ error: 'رزروی یافت نشد' }, { status: 404 });
    if (group.customerId !== decoded.userId) {
      return NextResponse.json({ error: 'شما اجازه‌ی پرداخت این رزرو را ندارید' }, { status: 403 });
    }
    if (group.paymentStatus !== 'PENDING') {
      return NextResponse.json({ error: 'این رزرو قبلاً پرداخت یا لغو شده است' }, { status: 400 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const callbackUrl = `${baseUrl}/api/booking-group/verify?groupId=${group.id}`;

    const { authority, paymentUrl } = await requestZarinpalPayment({
      amountToman: group.totalAmount,
      description: `رزرو نوبت در ${group.salon.name}`,
      callbackUrl,
      mobile: group.customerPhone,
    });

    await prisma.bookingGroup.update({
      where: { id: group.id },
      data: { authority },
    });

    return NextResponse.json({ paymentUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Error starting group payment:', error);
    return NextResponse.json({ error: error.message || 'خطا در اتصال به درگاه پرداخت' }, { status: 500 });
  }
}