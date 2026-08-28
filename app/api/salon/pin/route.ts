// app/api/salon/pin/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { requestZarinpalPayment } from '@/lib/zarinpal';

// هزینه و مدت پین کردن سالن — این عدد فقط داخل درخواست به زرین‌پال استفاده می‌شود
// و در پاسخ این API یا هر جای دیگر رابط کاربری خودمان نمایش داده نمی‌شود؛
// مبلغ را فقط خودِ درگاه زرین‌پال به کاربر نشان می‌دهد.
const PIN_PRICE_TOMAN = 3_000_000;
const PIN_DURATION_DAYS = 30;
const PIN_PLAN_ID = 'salon-pin-30d';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    // فقط صاحب اصلی سالن اجازه‌ی پین کردن دارد؛ مدیرها (SalonManager) نه
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (!salon) {
      return NextResponse.json({ error: 'شما مالک هیچ سالنی نیستید' }, { status: 403 });
    }

    if (salon.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'برای پین کردن، سالن شما باید ابتدا توسط ادمین تایید شده باشد' },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.create({
      data: {
        amount: PIN_PRICE_TOMAN,
        status: 'PENDING',
        planId: PIN_PLAN_ID,
        salonId: salon.id,
      },
    });

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || new URL(req.url).origin;
    const callbackUrl = `${baseUrl}/api/salon/pin/verify?paymentId=${payment.id}`;

    const { authority, paymentUrl } = await requestZarinpalPayment({
      amountToman: PIN_PRICE_TOMAN,
      description: `پین کردن سالن «${salon.name}» به مدت ${PIN_DURATION_DAYS} روز`,
      callbackUrl,
      mobile: user.phone,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { authority },
    });

    return NextResponse.json({ paymentUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Error starting salon pin payment:', error);
    return NextResponse.json({ error: error.message || 'خطا در اتصال به درگاه پرداخت' }, { status: 500 });
  }
}
