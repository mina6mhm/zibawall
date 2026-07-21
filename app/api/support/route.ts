//app/api/support/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
 
import { prisma } from '@/lib/prisma';
 
export const dynamic = 'force-dynamic';
 
// ثبت پیام پشتیبانی جدید توسط کاربر لاگین‌کرده
export async function POST(req: Request) {
  try {
    // --- بررسی احراز هویت (اجباری) ---
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
 
    if (!token) {
      return NextResponse.json(
        { error: 'برای ارسال پیام ابتدا وارد حساب کاربری خود شوید' },
        { status: 401 }
      );
    }
 
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }
 
    // --- اعتبارسنجی متن پیام ---
    const body = await req.json();
    const message: string = (body.message || '').trim();
 
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
      where: { id: decoded.userId },
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
 
    const adminUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { role: true }
    });
 
    if (adminUser?.role !== 'ADMIN') {
      return NextResponse.json({ error: 'شما دسترسی ادمین ندارید' }, { status: 403 });
    }
 
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status'); // اختیاری: فیلتر بر اساس وضعیت
 
    const messages = await prisma.supportMessage.findMany({
      where: statusFilter ? { status: statusFilter as any } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, phone: true, username: true }
        }
      }
    });
 
    return NextResponse.json({ messages }, { status: 200 });
 
  } catch (error) {
    console.error('Error fetching support messages:', error);
    return NextResponse.json(
      { error: 'خطای سرور در دریافت پیام‌ها' },
      { status: 500 }
    );
  }
}
