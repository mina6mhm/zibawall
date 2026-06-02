//app/api/auth/login-password/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { mobile, password } = await req.json();

    // بررسی وجود کاربر
    const user = await prisma.user.findUnique({ where: { phone: mobile } });
    
    if (!user) {
      return NextResponse.json({ error: 'کاربری با این شماره یافت نشد.' }, { status: 404 });
    }

    // تغییر نام فیلد بر اساس schema.prisma شما
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'برای این حساب رمز عبوری تنظیم نشده است. با کد یکبار مصرف وارد شوید.' }, { status: 400 });
    }

    // مقایسه رمز عبور وارد شده با رمز هش شده در دیتابیس
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!isMatch) {
      return NextResponse.json({ error: 'رمز عبور اشتباه است.' }, { status: 401 });
    }

    // تولید توکن
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, username: user.username }, 
      process.env.JWT_SECRET || 'fallback-secret-key', 
      { expiresIn: '30d' }
    );

    return NextResponse.json({ 
      message: 'ورود موفق', 
      token, 
      // username اضافه شد
      user: { id: user.id, name: user.name, username: user.username, phone: user.phone } 
    }, { status: 200 });


  } catch (error) {
    console.error("Login Password Error:", error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
