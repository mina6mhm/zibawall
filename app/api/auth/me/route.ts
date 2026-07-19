// app/api/auth/me/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as any;

    // گرفتن username از دیتابیس
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { phone: true, username: true, name: true, role: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    return NextResponse.json({ 
      phone: user.phone,
      userId: decoded.userId,
      role: user.role,
      username: user.username,
      name: user.name
    });
  } catch {
    return NextResponse.json({ error: 'توکن نامعتبر' }, { status: 401 });
  }
}