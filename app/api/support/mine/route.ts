// app/api/support/mine/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
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

    const messages = await prisma.supportMessage.findMany({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'desc' },
    });

    const unreadCount = messages.filter(
      (m) => m.adminReply && !m.seenByUser
    ).length;

    return NextResponse.json({ messages, unreadCount }, { status: 200 });

  } catch (error) {
    console.error('Error fetching my support messages:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}