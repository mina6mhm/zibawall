// app/api/auth/update-username/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    // 1. دریافت توکن از هدر
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'عدم دسترسی' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;

    // 2. احراز هویت توکن
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
    } catch (err) {
      return NextResponse.json({ error: 'توکن نامعتبر یا منقضی شده است' }, { status: 401 });
    }

    // 3. دریافت یوزرنیم از بادی درخواست
    const { username } = await req.json();

    if (!username || username.trim().length < 3) {
      return NextResponse.json({ error: 'نام کاربری نامعتبر است' }, { status: 400 });
    }

    // 4. بررسی اینکه آیا این یوزرنیم از قبل توسط شخص دیگری گرفته شده یا خیر
    const existingUser = await prisma.user.findUnique({
      where: { username }
    });

    if (existingUser && existingUser.id !== decoded.userId) {
      return NextResponse.json({ error: 'این نام کاربری قبلاً گرفته شده است' }, { status: 409 });
    }

    // 5. آپدیت کردن دیتابیس کاربر
    await prisma.user.update({
      where: { id: decoded.userId },
      data: { username: username.trim() }
    });

    return NextResponse.json({ success: true, message: 'نام کاربری با موفقیت ثبت شد' }, { status: 200 });

  } catch (error) {
    console.error("Update Username Error:", error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}