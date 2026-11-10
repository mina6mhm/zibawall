// app/api/admin/salons/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 200;

// لیست سالن‌ها برای پنل مدیریت (فقط ادمین) — پیش‌فرض فقط سالن‌های در انتظار تایید
// صفحه‌بندی: ?page=1&limit=100  (خروجی: salons, total, page, limit, hasMore)
export async function GET(req: Request) {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') || 'PENDING_APPROVAL';

    if (statusFilter !== 'ALL' && !/^[A-Z_]{1,40}$/.test(statusFilter)) {
      return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
    }

    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(searchParams.get('limit') || '', 10) || DEFAULT_LIMIT)
    );
    const page = Math.max(1, parseInt(searchParams.get('page') || '', 10) || 1);
    const skip = (page - 1) * limit;

    const where = statusFilter === 'ALL' ? undefined : { status: statusFilter as any };

    const [salons, total] = await Promise.all([
      prisma.salon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { name: true, phone: true } },
          socials: true,
        },
      }),
      prisma.salon.count({ where }),
    ]);

    return NextResponse.json(
      { salons, total, page, limit, hasMore: skip + salons.length < total },
      { status: 200 }
    );
  } catch (error) {
    // مقدار status نامعتبر برای enum قبلاً به خطای ۵۰۰ تبدیل می‌شد
    if (error instanceof Prisma.PrismaClientValidationError) {
      return NextResponse.json({ error: 'وضعیت نامعتبر است' }, { status: 400 });
    }
    console.error('Error fetching admin salons list:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت لیست سالن‌ها' }, { status: 500 });
  }
}