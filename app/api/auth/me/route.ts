// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'احراز هویت نشده' }, { status: 401 });
    }

    const secret = process.env.JWT_SECRET!;
    const decoded = jwt.verify(token, secret) as any;

    return NextResponse.json({ 
      phone: decoded.phone,
      userId: decoded.userId,
      role: decoded.role 
    });
  } catch {
    return NextResponse.json({ error: 'توکن نامعتبر' }, { status: 401 });
  }
}