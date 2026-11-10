// app/api/staff/my-salons/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// لیست سالن‌هایی که شماره‌ی موبایل کاربر لاگین‌شده به‌عنوان پرسنل در آن‌ها ثبت شده است
// یک شماره ممکن است در چند سالن مختلف به‌عنوان پرسنل ثبت شده باشد
export async function GET() {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { phone: true } });
    if (!user?.phone) {
      return NextResponse.json({ salons: [] });
    }

    const staffRecords = await prisma.staff.findMany({
      where: { phone: user.phone },
      include: { salon: { select: { id: true, name: true } } },
      take: 50,
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