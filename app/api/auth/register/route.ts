import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, username, password } = await req.json();

    if (!email || !username || !password) {
      return NextResponse.json({ error: 'ایمیل، نام کاربری و رمز عبور الزامی است' }, { status: 400 });
    }

    if (username.length < 3) {
      return NextResponse.json({ error: 'نام کاربری باید حداقل ۳ حرف باشد' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد' }, { status: 400 });
    }

    // بررسی تکراری نبودن ایمیل یا یوزرنیم
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return NextResponse.json({ error: 'این ایمیل قبلاً ثبت شده است' }, { status: 409 });
      }
      if (existingUser.username === username) {
        return NextResponse.json({ error: 'این نام کاربری قبلاً توسط شخص دیگری گرفته شده است' }, { status: 409 });
      }
    }

    // هش کردن رمز عبور
    const passwordHash = await bcrypt.hash(password, 10);

    // ثبت کاربر در دیتابیس
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        passwordHash,
      }
    });

    // تولید توکن
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret-key',
      { expiresIn: '30d' }
    );

    return NextResponse.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, username: user.username, role: user.role }
    }, { status: 201 });

  } catch (error) {
    console.error("Register Error:", error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
