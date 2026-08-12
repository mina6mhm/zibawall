// app/api/staff/my-salons/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// لیست سالن‌هایی که شماره‌ی موبایل کاربر لاگین‌شده به‌عنوان پرسنل در آن‌ها ثبت شده است
// یک شماره ممکن است در چند سالن مختلف به‌عنوان پرسنل ثبت شده باشد
export async function GET() {
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

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user?.phone) {
      return NextResponse.json({ salons: [] });
    }

    const staffRecords = await prisma.staff.findMany({
      where: { phone: user.phone },
      include: { salon: { select: { id: true, name: true } } },
    });

    const salons = staffRecords.map((s) => ({
      staffId: s.id,
      staffName: s.name,
      salonId: s.salon.id,
      salonName: s.salon.name,
    }));

    return NextResponse.json({ salons });
  } catch (error) {
    console.error('Error fetching staff salons:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}