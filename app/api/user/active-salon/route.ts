// app/api/user/active-salon/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { getAccessibleSalonsForUserId, ACTIVE_SALON_COOKIE } from '@/lib/salonAccess';

// سوییچ بین سالن‌هایی که کاربر بهشون دسترسی داره (مالکیت یا مدیریت)
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

    const body = await req.json();
    const salonId = typeof body?.salonId === 'string' ? body.salonId : '';
    if (!salonId) {
      return NextResponse.json({ error: 'آیدی سالن ارسال نشده است' }, { status: 400 });
    }

    // اطمینان از اینکه کاربر واقعاً به این سالن دسترسی دارد (مالک یا مدیر)
    const accessible = await getAccessibleSalonsForUserId(decoded.userId);
    const target = accessible.find((a) => a.salon.id === salonId);
    if (!target) {
      return NextResponse.json({ error: 'شما به این سالن دسترسی ندارید' }, { status: 403 });
    }

    const res = NextResponse.json({ success: true, salon: target.salon, isOwner: target.isOwner }, { status: 200 });
    res.cookies.set(ACTIVE_SALON_COOKIE, salonId, {
      httpOnly: false,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 365,
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
