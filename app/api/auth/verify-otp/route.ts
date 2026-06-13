// app/api/auth/verify-otp/route.ts

import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { mobile, code } = await req.json();

    let user = await prisma.user.findUnique({
      where: { phone: mobile }
    });

    // 👈 لاجیک مربوط به حساب تست
    if (mobile === '09109827633' && code === '12345') {
      // اگر حساب تست در دیتابیس نبود، آن را بساز
      if (!user) {
        user = await prisma.user.create({
          data: { phone: mobile }
        });
      }
    } else {
      // لاجیک عادی برای سایر کاربران
      if (!user || user.otpCode !== code) {
        return NextResponse.json({ error: 'کد وارد شده اشتباه است' }, { status: 400 });
      }

      if (user.otpExpiresAt && user.otpExpiresAt < new Date()) {
        return NextResponse.json({ error: 'کد منقضی شده است' }, { status: 400 });
      }

      // پاک کردن کد از دیتابیس پس از استفاده
      await prisma.user.update({
        where: { phone: mobile },
        data: { otpCode: null, otpExpiresAt: null }
      });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined in .env");
    }

    // تولید توکن
    const token = jwt.sign(
      { userId: user.id, phone: user.phone, role: user.role, username: user.username },
      secret,
      { expiresIn: '30d' }
    );

    const isNewUser = !user.username;

    return NextResponse.json({ 
      success: true, 
      token, 
      isNewUser, 
      user: { id: user.id, phone: user.phone, role: user.role, username: user.username } 
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
