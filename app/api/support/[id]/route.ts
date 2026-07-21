// app/api/support/[id]/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// PATCH: هم برای پاسخ ادمین، هم برای علامت "دیده‌شد" توسط کاربر
export async function PATCH(
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

    const supportMessage = await prisma.supportMessage.findUnique({ where: { id } });
    if (!supportMessage) {
      return NextResponse.json({ error: 'پیام یافت نشد' }, { status: 404 });
    }

    // --- حالت اول: کاربر پیام رو دید (علامت‌گذاری seen) ---
    if (body.seen === true) {
      if (supportMessage.userId !== decoded.userId) {
        return NextResponse.json({ error: 'دسترسی غیرمجاز' }, { status: 403 });
      }

      const updated = await prisma.supportMessage.update({
        where: { id },
        data: { seenByUser: true },
      });

      return NextResponse.json({ success: true, supportMessage: updated });
    }

    // --- حالت دوم: ادمین پاسخ می‌دهد ---
    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true },
    });

    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'شما دسترسی ادمین ندارید' }, { status: 403 });
    }

    const reply: string = (body.reply || '').trim();
    if (!reply) {
      return NextResponse.json({ error: 'متن پاسخ نمی‌تواند خالی باشد' }, { status: 400 });
    }

    const updated = await prisma.supportMessage.update({
      where: { id },
      data: {
        adminReply: reply,
        repliedAt: new Date(),
        status: body.status || 'ANSWERED',
        seenByUser: false, // کاربر باید دوباره ببیندش
      },
    });

    return NextResponse.json({ success: true, supportMessage: updated });

  } catch (error) {
    console.error('Error updating support message:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}