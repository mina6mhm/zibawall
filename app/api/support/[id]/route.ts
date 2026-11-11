// app/api/support/[id]/route.ts
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { parseJsonBody } from '@/lib/http';

export const dynamic = 'force-dynamic';

const SUPPORT_STATUSES = ['PENDING', 'IN_PROGRESS', 'ANSWERED', 'CLOSED'] as const;
type SupportStatusValue = (typeof SUPPORT_STATUSES)[number];

// سقف تعداد پیام‌های یک مکالمه در یک پاسخ (مکالمه‌ی بی‌انتها نباید کل جدول را یک‌جا بکشد)
const MAX_REPLIES = 500;

// GET: گرفتن کل مکالمه (پیام اول + همه‌ی پاسخ‌ها)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ticket = await prisma.supportMessage.findUnique({
      where: { id },
      include: {
        replies: { orderBy: { createdAt: 'asc' }, take: MAX_REPLIES },
        user: { select: { name: true, phone: true, username: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'مکالمه یافت نشد' }, { status: 404 });
    }

    const isOwner = ticket.userId === auth.userId;
    let isAdmin = false;

    if (!isOwner) {
      const me = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { role: true },
      });
      isAdmin = me?.role === 'ADMIN';
      if (!isAdmin) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }
    }

    return NextResponse.json({ ticket, isAdmin });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// PATCH: فقط برای علامت‌گذاری "دیده‌شد" یا تغییر وضعیت (نه ارسال پیام)
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ticket = await prisma.supportMessage.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'مکالمه یافت نشد' }, { status: 404 });
    }

    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;

    // --- کاربر: علامت‌گذاری دیده‌شدن ---
    if (body.seen === true || body.seenByUser === true) {
      if (ticket.userId !== auth.userId) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }
      const updated = await prisma.supportMessage.update({
        where: { id },
        data: { seenByUser: true },
      });
      return NextResponse.json({ success: true, ticket: updated });
    }

    // --- ادمین: علامت‌گذاری دیده‌شدن یا تغییر وضعیت ---
    const adminUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });
    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'شما دسترسی ادمین ندارید' }, { status: 403 });
    }

    const data: { seenByAdmin?: boolean; status?: SupportStatusValue } = {};
    if (body.seenByAdmin === true) data.seenByAdmin = true;
    if (body.status !== undefined && body.status !== null && body.status !== '') {
      // وضعیت نامعتبر قبلاً مستقیم به Prisma می‌رفت و ۵۰۰ می‌داد
      if (!SUPPORT_STATUSES.includes(body.status as SupportStatusValue)) {
        return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
      }
      data.status = body.status as SupportStatusValue;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'داده‌ای برای بروزرسانی ارسال نشده' }, { status: 400 });
    }

    const updated = await prisma.supportMessage.update({ where: { id }, data });
    return NextResponse.json({ success: true, ticket: updated });

  } catch (error) {
    console.error('Error updating ticket:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// DELETE: حذف کامل مکالمه (توسط صاحب تیکت یا ادمین)
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const ticket = await prisma.supportMessage.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'مکالمه یافت نشد' }, { status: 404 });
    }

    const isOwner = ticket.userId === auth.userId;

    if (!isOwner) {
      const me = await prisma.user.findUnique({
        where: { id: auth.userId },
        select: { role: true },
      });
      if (me?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }
    }

    // اول پاسخ‌ها حذف می‌شن (برای احتیاط، حتی اگه cascade در schema ست شده باشه)
    await prisma.supportReply.deleteMany({ where: { ticketId: id } });
    await prisma.supportMessage.deleteMany({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });

  } catch (error) {
    console.error('Error deleting ticket:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف مکالمه' }, { status: 500 });
  }
}
