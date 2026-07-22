// app/api/support/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function getAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as any;
  } catch {
    return null;
  }
}

// GET: گرفتن کل مکالمه (پیام اول + همه‌ی پاسخ‌ها)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decoded = await getAuth();
    if (!decoded) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    const ticket = await prisma.supportMessage.findUnique({
      where: { id },
      include: {
        replies: { orderBy: { createdAt: 'asc' } },
        user: { select: { name: true, phone: true, username: true } },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'مکالمه یافت نشد' }, { status: 404 });
    }

    const isOwner = ticket.userId === decoded.userId;
    let isAdmin = false;

    if (!isOwner) {
      const me = await prisma.user.findUnique({
        where: { id: decoded.userId },
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
    const decoded = await getAuth();
    if (!decoded) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    const ticket = await prisma.supportMessage.findUnique({ where: { id } });
    if (!ticket) {
      return NextResponse.json({ error: 'مکالمه یافت نشد' }, { status: 404 });
    }

    const body = await req.json();

    // --- کاربر: علامت‌گذاری دیده‌شدن ---
    if (body.seen === true || body.seenByUser === true) {
      if (ticket.userId !== decoded.userId) {
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
      where: { id: decoded.userId },
      select: { role: true },
    });
    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'شما دسترسی ادمین ندارید' }, { status: 403 });
    }

    const data: any = {};
    if (body.seenByAdmin === true) data.seenByAdmin = true;
    if (body.status) data.status = body.status;

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