// app/api/auth/verify-otp/route.ts

import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { mobile, code } = await req.json();

    if (!mobile || !code) {
      return NextResponse.json(
        { error: 'اطلاعات ناقص است' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        phone: mobile
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'کاربر یافت نشد' },
        { status: 404 }
      );
    }

    if (user.otpCode !== code) {
      return NextResponse.json(
        { error: 'کد وارد شده اشتباه است' },
        { status: 400 }
      );
    }

    if (
      user.otpExpiresAt &&
      user.otpExpiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: 'کد منقضی شده است' },
        { status: 400 }
      );
    }

    // پاک کردن OTP پس از مصرف
    await prisma.user.update({
      where: {
        phone: mobile
      },
      data: {
        otpCode: null,
        otpExpiresAt: null
      }
    });

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        role: user.role,
      },
      secret,
      {
        expiresIn: '30d'
      }
    );

    const isNewUser = !user.username;

    const response = NextResponse.json({
      success: true,
      isNewUser,
      user: {
        id: user.id,
        phone: user.phone,
        role: user.role,
        username: user.username,
      }
    });

    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 روز
    });

    return response;

  } catch (error) {
    console.error('Verify OTP Error:', error);

    return NextResponse.json(
      { error: 'خطای سرور' },
      { status: 500 }
    );
  }
}