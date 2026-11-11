// app/api/support/[id]/reply/route.ts
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { parseJsonBody, tooManyRequests } from '@/lib/http';

export const dynamic = 'force-dynamic';

// POST: ارسال یک پیام جدید در مکالمه (چه کاربر، چه ادمین)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // قبلاً این مسیر هیچ محدودیتی نداشت و یک کاربر می‌توانست هزاران پیام در یک مکالمه بسازد
    // (مسیر ساخت تیکت جدید محدودیت داشت ولی ادامه‌ی مکالمه نه)
    const limit = await rateLimit(`support-reply:${auth.userId}`, 20, 10 * 60 * 1000);
    if (!limit.ok) return tooManyRequests(limit.retryAfter, 'تعداد پیام‌ها زیاد است. کمی بعد دوباره تلاش کنید');

    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;

    // قبلاً `(body.message || '').trim()` برای message غیررشته (مثل عدد) خطای ۵۰۰ می‌داد
    const message: string = typeof parsed.body.message === 'string' ? parsed.body.message.trim() : '';

    if (!message) {
      return NextResponse.json({ error: 'متن پیام نمی‌تواند خالی باشد' }, { status: 400 });
    }
    if (message.length > 2000) {
      return NextResponse.json({ error: 'متن پیام بیش از حد طولانی است' }, { status: 400 });
    }

    const ticket = await prisma.supportMessage.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'مکالمه یافت نشد' }, { status: 404 });
    }

    const isOwner = ticket.userId === auth.userId;
    let sender: 'USER' | 'ADMIN';

    if (isOwner) {
      sender = 'USER';
    } else {
      const me = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { role: true },
      });
      if (me?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }
      sender = 'ADMIN';
    }

    // --- بروزرسانی وضعیت و پرچم‌های دیده‌شدن ---
    const updateData: {
      seenByUser?: boolean;
      seenByAdmin?: boolean;
      status?: 'IN_PROGRESS' | 'ANSWERED';
      repliedAt?: Date;
    } = {};
    if (sender === 'ADMIN') {
      updateData.seenByUser = false;   // کاربر باید دوباره ببینه
      updateData.seenByAdmin = true;
      updateData.status = 'ANSWERED';
      updateData.repliedAt = new Date();
    } else {
      updateData.seenByAdmin = false;  // ادمین باید دوباره ببینه
      updateData.seenByUser = true;
      // اگه قبلاً بسته/پاسخ داده شده بود، دوباره باز میشه چون کاربر ادامه داده
      if (ticket.status === 'ANSWERED' || ticket.status === 'CLOSED') {
        updateData.status = 'IN_PROGRESS';
      }
    }

    // ساخت پاسخ + بروزرسانی تیکت در «یک» تراکنش: قبلاً اگر مرحله‌ی دوم خطا می‌داد،
    // پاسخ ساخته می‌شد ولی وضعیت/پرچم‌ها بروز نمی‌شد (ادمین پیام جدید را نمی‌دید)
    const [reply, updatedTicket] = await prisma.$transaction([
      prisma.supportReply.create({ data: { ticketId: id, message, sender } }),
      prisma.supportMessage.update({ where: { id }, data: updateData }),
    ]);

    return NextResponse.json({ success: true, reply, ticket: updatedTicket }, { status: 201 });

  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json({ error: 'خطای سرور در ارسال پیام' }, { status: 500 });
  }
}
