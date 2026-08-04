// app/api/salon/[id]/booking-categories/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// فقط دسته‌بندی‌ها و خدمات فعال را برمی‌گرداند — برای نمایش به مشتری در صفحه‌ی سالن
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: salonId } = await params;

  const categories = await prisma.bookingCategory.findMany({
    where: { salonId, isActive: true },
    orderBy: { order: 'asc' },
    include: {
      services: { where: { isActive: true }, orderBy: { order: 'asc' } },
    },
  });

  return NextResponse.json({ categories }, { status: 200 });
}