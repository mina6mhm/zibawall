import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'ایمیل و رمز عبور الزامی است' }, { status: 400 });
    }

    // جستجوی کاربر با ایمیل
    const user = await prisma.user.findUnique({ 
      where: { email: email.toLowerCase() } 
    });
    
    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'ایمیل یا رمز عبور اشتباه است.' }, { status: 401 });
    }

    // بررسی درستی رمز عبور
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    
    if (!isMatch) {
      return NextResponse.json({ error: 'ایمیل یا رمز عبور اشتباه است.' }, { status: 401 });
    }

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
    }, { status: 200 });

  } catch (error) {
    console.error("Login Error:", error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}
