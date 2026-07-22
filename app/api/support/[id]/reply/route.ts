// app/api/support/[id]/reply/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// POST: ارسال یک پیام جدید در مکالمه (چه کاربر، چه ادمین)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const message: string = (body.message || '').trim();

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

    const isOwner = ticket.userId === decoded.userId;
    let sender: 'USER' | 'ADMIN';

    if (isOwner) {
      sender = 'USER';
    } else {
      const me = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { role: true },
      });
      if (me?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }
      sender = 'ADMIN';
    }

    const reply = await prisma.supportReply.create({
      data: { ticketId: id, message, sender },
    });

    // --- بروزرسانی وضعیت و پرچم‌های دیده‌شدن ---
    const updateData: any = {};
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

    const updatedTicket = await prisma.supportMessage.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, reply, ticket: updatedTicket }, { status: 201 });

  } catch (error) {
    console.error('Error sending reply:', error);
    return NextResponse.json({ error: 'خطای سرور در ارسال پیام' }, { status: 500 });
  }
}
