// app/api/user/active-salon/route.ts
import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAccessibleSalonsForUserId, ACTIVE_SALON_COOKIE } from '@/lib/salonAccess';
import { parseJsonBody } from '@/lib/http';

// سوییچ بین سالن‌هایی که کاربر بهشون دسترسی داره (مالکیت یا مدیریت)
export async function POST(req: Request) {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;

    const salonId = typeof parsed.body.salonId === 'string' ? parsed.body.salonId : '';
    if (!salonId) {
      return NextResponse.json({ error: 'آیدی سالن ارسال نشده است' }, { status: 400 });
    }

    // اطمینان از اینکه کاربر واقعاً به این سالن دسترسی دارد (مالک یا مدیر)
    const accessible = await getAccessibleSalonsForUserId(auth.userId);
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
  } catch (error) {
    console.error('Error switching active salon:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
