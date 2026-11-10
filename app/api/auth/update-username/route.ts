// app/api/auth/update-username/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    // اگر فیلد رشته نبود، .trim() می‌ترکید و ۵۰۰ می‌داد
    const username = typeof body?.username === 'string' ? body.username.trim() : '';
    const name = typeof body?.name === 'string' ? body.name.trim() : '';

    if (!username) {
      return NextResponse.json({ error: 'نام کاربری الزامی است' }, { status: 400 });
    }

    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        { error: 'نام کاربری باید بین ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، اعداد و _ باشد' },
        { status: 400 }
      );
    }

    if (name.length > 60) {
      return NextResponse.json({ error: 'نام وارد شده بیش از حد طولانی است' }, { status: 400 });
    }

    try {
      // بدون findUnique جداگانه: بررسی + نوشتن جدا باعث race می‌شد (دو کاربر هم‌زمان
      // همان یوزرنیم را می‌گرفتند و یکی ۵۰۰ می‌خورد). یکتایی را خودِ دیتابیس تضمین می‌کند.
      await prisma.user.update({
        where: { id: auth.userId },
        data: { username, ...(name ? { name } : {}) },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002') {
          return NextResponse.json({ error: 'این نام کاربری قبلاً ثبت شده است' }, { status: 409 });
        }
        if (e.code === 'P2025') {
          return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
        }
      }
      throw e;
    }

    return NextResponse.json({ success: true, message: 'اطلاعات با موفقیت ثبت شد' }, { status: 200 });
  } catch (error) {
    console.error('Update Username Error:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}