// app/api/user/profile/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// دریافت اطلاعات کاربر و سالن او
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email'); // تغییر به ایمیل

  if (!email) return NextResponse.json({ error: 'ایمیل الزامی است' }, { status: 400 });

  try {
    const user = await prisma.user.findUnique({
      where: { email }, // جستجو بر اساس ایمیل
      include: { salon: true } 
    });

    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

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
    // حذف phone و استفاده از email به عنوان شناسه اصلی
    const { email, name, newPassword, username } = body;

    if (!email) {
      return NextResponse.json({ error: 'ایمیل برای شناسایی کاربر الزامی است' }, { status: 400 });
    }

    let updateData: any = { name };

    if (username !== undefined) {
      updateData.username = username;
    }

    if (newPassword) {
      updateData.passwordHash = await bcrypt.hash(newPassword, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { email }, // آپدیت بر اساس ایمیل
      data: updateData,
      include: { salon: true }
    });

    const { passwordHash, ...safeUser } = updatedUser;
    return NextResponse.json({ message: 'پروفایل آپدیت شد', user: safeUser });
    
  } catch (error: any) {
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
