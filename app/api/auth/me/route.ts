// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET() {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { phone: true, username: true, name: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404, headers: NO_STORE });
    }

    return NextResponse.json(
      {
        phone: user.phone,
        userId: auth.userId,
        role: user.role,
        username: user.username,
        name: user.name,
      },
      { headers: NO_STORE }
    );
  } catch (error) {
    // قبلاً هر خطا (حتی قطع شدن دیتابیس زیر فشار) ۴۰۱ برمی‌گرداند و کلاینت
    // کاربر را به‌اشتباه از حساب خارج می‌کرد. خطای سرور باید ۵۰۰ باشد.
    console.error('Error in /api/auth/me:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500, headers: NO_STORE });
  }
}