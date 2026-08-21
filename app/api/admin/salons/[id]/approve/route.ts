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

    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    if (salon.status !== 'PENDING_APPROVAL' && salon.status !== 'REJECTED') {
      return NextResponse.json(
        { error: 'این سالن در وضعیت قابل‌تایید نیست' },
        { status: 400 }
      );
    }

    // اطمینان از این‌که اشتراک منقضی محسوب نشود (همان الگوی create-pending)
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        rejectionReason: null,
        reviewedAt: new Date(),
        subscriptionExpiresAt: salon.subscriptionExpiresAt ?? farFuture,
      },
    });

    // TODO: در صورت نیاز، اینجا پیامک تایید به سالن‌دار ارسال شود (lib/sms.ts)

    return NextResponse.json({ success: true, salon: updatedSalon }, { status: 200 });
  } catch (error) {
    console.error('Error approving salon:', error);
    return NextResponse.json({ error: 'خطای سرور در تایید سالن' }, { status: 500 });
  }
}