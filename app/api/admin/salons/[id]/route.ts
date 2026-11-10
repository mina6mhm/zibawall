// app/api/admin/salons/[id]/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

// حذف کامل یک سالن (فقط ادمین). کاربرِ صاحب سالن دست‌نخورده می‌ماند.
// ⚠️ به‌خاطر Cascade، همه‌ی نوبت‌ها (از جمله نوبت‌های پرداخت‌شده) هم پاک می‌شوند.
// اگر سابقه‌ی مالی مهم است، به‌جای حذف فیزیکی از status (مثلاً SUSPENDED/DELETED) استفاده کنید.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { id } = await params;

    try {
      await prisma.salon.delete({ where: { id } });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        // دو ادمین هم‌زمان حذف کنند: دومی قبلاً ۵۰۰ می‌گرفت
        if (e.code === 'P2025') {
          return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 });
        }
        if (e.code === 'P2003') {
          return NextResponse.json(
            { error: 'این سالن به‌خاطر رکوردهای وابسته قابل حذف نیست' },
            { status: 409 }
          );
        }
      }
      throw e;
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting salon:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف سالن' }, { status: 500 });
  }
}