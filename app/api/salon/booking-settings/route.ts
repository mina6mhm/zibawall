// app/api/salon/booking-settings/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    const salon = await prisma.salon.findUnique({ where: { userId: decoded.userId } });
    if (!salon) return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });

    const body = await req.json();
    if (typeof body.bookingEnabled !== 'boolean') {
      return NextResponse.json({ error: 'مقدار نامعتبر است' }, { status: 400 });
    }

    const updated = await prisma.salon.update({
      where: { id: salon.id },
      data: { bookingEnabled: body.bookingEnabled },
    });

    return NextResponse.json({ success: true, bookingEnabled: updated.bookingEnabled }, { status: 200 });
  } catch (error) {
    console.error('Error updating booking settings:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}