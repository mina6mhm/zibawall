// app/api/admin/salons/[id]/reject/route.ts
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
    const body = await req.json().catch(() => ({}));
    const reason: string = (body?.reason || '').trim();

    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    if (salon.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: 'این سالن در وضعیت در انتظار تایید نیست' },
        { status: 400 }
      );
    }

    const updatedSalon = await prisma.salon.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: reason || null,
        reviewedAt: new Date(),
      },
    });

    // TODO: در صورت نیاز، اینجا پیامک اطلاع‌رسانی رد شدن به سالن‌دار ارسال شود (lib/sms.ts)

    return NextResponse.json({ success: true, salon: updatedSalon }, { status: 200 });
  } catch (error) {
    console.error('Error rejecting salon:', error);
    return NextResponse.json({ error: 'خطای سرور در رد کردن سالن' }, { status: 500 });
  }
}