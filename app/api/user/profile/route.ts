// app/api/user/profile/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// دریافت اطلاعات کاربر و سالن او
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const phone = searchParams.get('phone'); // فرض بر این است که شماره موبایل را می‌فرستیم

  if (!phone) return NextResponse.json({ error: 'شماره موبایل الزامی است' }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { phone },
      include: { salon: true } // گرفتن اطلاعات سالن همراه با کاربر
    });

    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    // حذف پسورد هش شده از خروجی برای امنیت
    const { passwordHash, ...safeUser } = user;
    return NextResponse.json(safeUser);
  } catch (error) {
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// آپدیت اطلاعات کاربر
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { phone, name, email, newPassword, username } = body;

    let updateData: any = { name, email };

    // اگر username ارسال شده بود، به دیتای آپدیت اضافه شود
    if (username !== undefined) {
      updateData.username = username;
    }

    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { phone },
      data: updateData,
      include: { salon: true }
    });

    const { passwordHash, ...safeUser } = updatedUser;
    return NextResponse.json({ message: 'پروفایل آپدیت شد', user: safeUser });
    
  } catch (error: any) {
    // خطای P2002 در پریزما به معنای نقض Unique Constraint است
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return NextResponse.json(
        { error: 'این نام کاربری قبلاً توسط شخص دیگری ثبت شده است. لطفاً نام دیگری انتخاب کنید.' }, 
        { status: 400 }
      );
    }
    
    console.error('Profile update error:', error);
    return NextResponse.json({ error: 'خطا در ذخیره اطلاعات' }, { status: 500 });
  }
}
