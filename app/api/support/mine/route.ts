// app/api/support/mine/route.ts
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// سقف تعداد تیکت‌ها در یک پاسخ — این مسیر با زنگ اعلان (SupportBell) مرتب صدا زده می‌شود
const MAX_TICKETS = 200;

export async function GET() {
  try {
    // getAuthUser وجود userId معتبر در توکن را هم چک می‌کند؛ قبلاً با توکنِ بدون userId
    // شرط where حذف می‌شد (undefined = بدون فیلتر) و تیکت‌های «همه‌ی کاربران» برمی‌گشت
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const tickets = await prisma.supportMessage.findMany({
      where: { userId: auth.userId },
      orderBy: { updatedAt: 'desc' },
      take: MAX_TICKETS,
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
