// app/api/admin/salons/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export const dynamic = 'force-dynamic';

// حذف کامل یک سالن (فقط ادمین). چون رابطه‌ی Salon → User با onDelete: Cascade
// تعریف شده، این مسیر فقط خودِ سالن را حذف می‌کند و کاربرِ صاحب سالن دست‌نخورده
// باقی می‌ماند. رکوردهای وابسته به سالن (نوبت‌ها، نظرات، پرسنل، مدیران و ...)
// به‌خاطر Cascade روی خود مدل Salon به‌صورت خودکار حذف می‌شوند.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { id } = await params;

    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: 'سالن یافت نشد' }, { status: 404 });
    }

    await prisma.salon.delete({ where: { id } });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting salon:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف سالن' }, { status: 500 });
  }
}