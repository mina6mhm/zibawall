// app/api/admin/salons/[id]/approve/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if ('error' in admin) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }

    const { id } = await params;

    // تغییر وضعیت اتمیک (جلوگیری از تایید/رد هم‌زمان توسط دو ادمین)
    const result = await prisma.salon.updateMany({
      where: { id, status: { in: ['PENDING_APPROVAL', 'REJECTED'] } },
      data: {
        status: 'ACTIVE',
        rejectionReason: null,
        reviewedAt: new Date(),
      },
    });

    if (result.count === 0) {
      const exists = await prisma.salon.findUnique({ where: { id }, select: { id: true } });
      if (!exists) return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
      return NextResponse.json({ error: 'این سالن در وضعیت قابل‌تایید نیست' }, { status: 400 });
    }

    // اطمینان از این‌که اشتراک منقضی محسوب نشود (همان الگوی create-pending)
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);
    await prisma.salon.updateMany({
      where: { id, subscriptionExpiresAt: null },
      data: { subscriptionExpiresAt: farFuture },
    });

    const updatedSalon = await prisma.salon.findUnique({ where: { id } });

    // TODO: در صورت نیاز، اینجا پیامک تایید به سالن‌دار ارسال شود (lib/sms.ts)

    return NextResponse.json({ success: true, salon: updatedSalon }, { status: 200 });
  } catch (error) {
    console.error('Error approving salon:', error);
    return NextResponse.json({ error: 'خطای سرور در تایید سالن' }, { status: 500 });
  }
}