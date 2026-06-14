// app/api/auth/update-username/route.ts

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    // دریافت JWT Secret
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    // دریافت توکن از Cookie
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'ابتدا وارد حساب کاربری شوید' },
        { status: 401 }
      );
    }

    let decoded: any;

    try {
      decoded = jwt.verify(token, secret);
    } catch {
      return NextResponse.json(
        { error: 'توکن نامعتبر یا منقضی شده است' },
        { status: 401 }
      );
    }

    // دریافت اطلاعات درخواست
    const body = await req.json();
    const username = body?.username?.trim();

    if (!username) {
      return NextResponse.json(
        { error: 'نام کاربری الزامی است' },
        { status: 400 }
      );
    }

    // فقط حروف انگلیسی، عدد و _
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;

    if (!usernameRegex.test(username)) {
      return NextResponse.json(
        {
          error:
            'نام کاربری باید بین ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، اعداد و _ باشد'
        },
        { status: 400 }
      );
    }

    // بررسی تکراری نبودن
    const existingUser = await prisma.user.findUnique({
      where: {
        username
      }
    });

    if (
      existingUser &&
      existingUser.id !== decoded.userId
    ) {
      return NextResponse.json(
        {
          error: 'این نام کاربری قبلاً ثبت شده است'
        },
        { status: 409 }
      );
    }

    // آپدیت کاربر
    await prisma.user.update({
      where: {
        id: decoded.userId
      },
      data: {
        username
      }
    });

    return NextResponse.json(
      {
        success: true,
        message: 'نام کاربری با موفقیت ثبت شد'
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Update Username Error:', error);

    return NextResponse.json(
      {
        error: 'خطای سرور'
      },
      { status: 500 }
    );
  }
}