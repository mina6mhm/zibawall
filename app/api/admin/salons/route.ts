// app/api/admin/salons/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

// لیست سالن‌ها برای پنل مدیریت (فقط ادمین) — پیش‌فرض فقط سالن‌های در انتظار تایید
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'PENDING_APPROVAL';

    const salons = await prisma.salon.findMany({
      where: statusFilter === 'ALL' ? undefined : { status: statusFilter as any },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, phone: true } },
        socials: true,
      },
    });

    return NextResponse.json({ salons }, { status: 200 });
  } catch (error) {
    console.error('Error fetching admin salons list:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت لیست سالن‌ها' }, { status: 500 });
  }
}