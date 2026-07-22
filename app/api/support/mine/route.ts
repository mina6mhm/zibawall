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

    const tickets = await prisma.supportMessage.findMany({
      where: { userId: decoded.userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        replies: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const messages = tickets.map((t) => {
      const lastReply = t.replies[0];
      const lastMessage = lastReply ? lastReply.message : (t.adminReply || t.message);
      const lastSender = lastReply ? lastReply.sender : (t.adminReply ? 'ADMIN' : 'USER');
      return {
        id: t.id,
        message: t.message,
        status: t.status,
        adminReply: t.adminReply,
        seenByUser: t.seenByUser,
        createdAt: t.createdAt,
        lastMessage,
        lastSender,
      };
    });

    const unreadCount = messages.filter(
      (m) => !m.seenByUser && m.lastSender === 'ADMIN'
    ).length;

    return NextResponse.json({ messages, unreadCount }, { status: 200 });

  } catch (error) {
    console.error('Error fetching my support messages:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}