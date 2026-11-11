//app/api/support/route.ts
import { NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { parseJsonBody } from '@/lib/http';
 
export const dynamic = 'force-dynamic';

const SUPPORT_STATUSES = ['PENDING', 'IN_PROGRESS', 'ANSWERED', 'CLOSED'] as const;
 
// ثبت پیام پشتیبانی جدید توسط کاربر لاگین‌کرده
export async function POST(req: Request) {
  try {
    // --- بررسی احراز هویت (اجباری) ---
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId;
 
    // ضد اسپم: ۵ پیام در ۱۰ دقیقه برای هر کاربر
    const limit = await rateLimit(`support:${userId}`, 5, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'تعداد پیام‌ها زیاد است. کمی بعد دوباره تلاش کنید' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    // --- اعتبارسنجی متن پیام ---
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;
    const message: string = typeof parsed.body.message === 'string' ? parsed.body.message.trim() : '';
 
    if (!message) {
      return NextResponse.json(
        { error: 'متن پیام نمی‌تواند خالی باشد' },
        { status: 400 }
      );
    }
 
    if (message.length > 2000) {
      return NextResponse.json(
        { error: 'متن پیام بیش از حد طولانی است (حداکثر ۲۰۰۰ کاراکتر)' },
        { status: 400 }
      );
    }
 
    // --- دریافت اطلاعات کامل کاربر و سالنش (برای اسنپ‌شات) ---
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phone: true,
        salon: {
          select: { id: true, name: true }
        }
      }
    });
 
    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }
 
    const supportMessage = await prisma.supportMessage.create({
      data: {
        message,
        userId: user.id,
        phone: user.phone,
        name: user.name,
        hadSalon: !!user.salon,
        salonId: user.salon?.id || null,
        salonName: user.salon?.name || null,
      }
    });
 
    return NextResponse.json(
      { success: true, supportMessage },
      { status: 201 }
    );
 
  } catch (error) {
    console.error('Error creating support message:', error);
    return NextResponse.json(
      { error: 'خطای سرور در ثبت پیام پشتیبانی' },
      { status: 500 }
    );
  }
}
 
// دریافت لیست پیام‌ها (فقط ادمین)
export async function GET(req: Request) {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const adminUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true }
    });

    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'شما دسترسی ادمین ندارید' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status');
    // فیلتر نامعتبر قبلاً با `as any` مستقیم به Prisma می‌رفت و ۵۰۰ می‌داد
    if (statusFilter && !SUPPORT_STATUSES.includes(statusFilter as (typeof SUPPORT_STATUSES)[number])) {
      return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
    }

    const tickets = await prisma.supportMessage.findMany({
      where: statusFilter ? { status: statusFilter as (typeof SUPPORT_STATUSES)[number] } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 300, // قبلاً همه‌ی تیکت‌ها یک‌جا بارگذاری می‌شد
      include: {
        user: { select: { name: true, phone: true, username: true } },
        replies: { orderBy: { createdAt: 'desc' }, take: 1 },
      }
    });

    const messages = tickets.map((t) => {
      const lastReply = t.replies[0];
      const lastMessage = lastReply ? lastReply.message : (t.adminReply || t.message);
      const lastSender = lastReply ? lastReply.sender : (t.adminReply ? 'ADMIN' : 'USER');
      return {
        id: t.id,
        message: t.message,
        status: t.status,
        createdAt: t.createdAt,
        phone: t.phone,
        name: t.name,
        hadSalon: t.hadSalon,
        salonName: t.salonName,
        user: t.user,
        seenByAdmin: t.seenByAdmin,
        lastMessage,
        lastSender,
      };
    });

    return NextResponse.json({ messages }, { status: 200 });

  } catch (error) {
    console.error('Error fetching support messages:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت پیام‌ها' }, { status: 500 });
  }
}