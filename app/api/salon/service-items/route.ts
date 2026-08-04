// app/api/salon/service-items/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnedSalonFromToken } from '@/lib/auth-salon';

async function assertCategoryOwnership(categoryId: string, salonId: string) {
  const category = await prisma.bookingCategory.findUnique({ where: { id: categoryId } });
  return category && category.salonId === salonId ? category : null;
}

// افزودن خدمت به یک دسته‌بندی
export async function POST(req: Request) {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json();
  const { categoryId, name, durationMinutes, price } = body;

  if (!categoryId || !(await assertCategoryOwnership(categoryId, result.salon.id))) {
    return NextResponse.json({ error: 'دسته‌بندی یافت نشد' }, { status: 404 });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'نام خدمت را وارد کنید' }, { status: 400 });
  }
  if (typeof durationMinutes !== 'number' || durationMinutes <= 0) {
    return NextResponse.json({ error: 'مدت‌زمان خدمت باید بزرگ‌تر از صفر باشد' }, { status: 400 });
  }

  const item = await prisma.serviceItem.create({
    data: {
      categoryId,
      name: name.trim(),
      durationMinutes: Math.round(durationMinutes),
      price: typeof price === 'number' && price > 0 ? Math.round(price) : null,
    },
  });

  return NextResponse.json({ success: true, item }, { status: 201 });
}

// ویرایش خدمت
export async function PUT(req: Request) {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json();
  const { id, name, durationMinutes, price, isActive } = body;

  const existing = await prisma.serviceItem.findUnique({ where: { id }, include: { category: true } });
  if (!existing || existing.category.salonId !== result.salon.id) {
    return NextResponse.json({ error: 'خدمت یافت نشد' }, { status: 404 });
  }
  if (durationMinutes !== undefined && (typeof durationMinutes !== 'number' || durationMinutes <= 0)) {
    return NextResponse.json({ error: 'مدت‌زمان خدمت باید بزرگ‌تر از صفر باشد' }, { status: 400 });
  }

  const item = await prisma.serviceItem.update({
    where: { id },
    data: {
      ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
      ...(typeof durationMinutes === 'number' ? { durationMinutes: Math.round(durationMinutes) } : {}),
      ...(price !== undefined ? { price: typeof price === 'number' && price > 0 ? Math.round(price) : null } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
    },
  });

  return NextResponse.json({ success: true, item }, { status: 200 });
}

// حذف خدمت
export async function DELETE(req: Request) {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'آیدی ارسال نشده است' }, { status: 400 });

  const existing = await prisma.serviceItem.findUnique({ where: { id }, include: { category: true } });
  if (!existing || existing.category.salonId !== result.salon.id) {
    return NextResponse.json({ error: 'خدمت یافت نشد' }, { status: 404 });
  }

  await prisma.serviceItem.delete({ where: { id } });
  return NextResponse.json({ success: true }, { status: 200 });
}