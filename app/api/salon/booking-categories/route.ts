// app/api/salon/booking-categories/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getOwnedSalonFromToken } from '@/lib/auth-salon';

// لیست دسته‌بندی‌ها به‌همراه خدمات هرکدام (برای پنل مدیریت سالن‌دار)
export async function GET() {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const categories = await prisma.bookingCategory.findMany({
    where: { salonId: result.salon.id },
    orderBy: { order: 'asc' },
    include: { services: { orderBy: { order: 'asc' } } },
  });

  return NextResponse.json({ categories }, { status: 200 });
}

// ساخت دسته‌بندی جدید
export async function POST(req: Request) {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json();
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const depositAmount = typeof body?.depositAmount === 'number' && body.depositAmount >= 0 ? Math.round(body.depositAmount) : 0;

  if (!title) return NextResponse.json({ error: 'عنوان دسته‌بندی را وارد کنید' }, { status: 400 });

  const category = await prisma.bookingCategory.create({
    data: { salonId: result.salon.id, title, depositAmount },
  });

  return NextResponse.json({ success: true, category }, { status: 201 });
}

// ویرایش دسته‌بندی
export async function PUT(req: Request) {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const body = await req.json();
  const { id, title, isActive, depositAmount } = body;

  const existing = await prisma.bookingCategory.findUnique({ where: { id } });
  if (!existing || existing.salonId !== result.salon.id) {
    return NextResponse.json({ error: 'دسته‌بندی یافت نشد' }, { status: 404 });
  }

  const category = await prisma.bookingCategory.update({
    where: { id },
    data: {
      ...(typeof title === 'string' && title.trim() ? { title: title.trim() } : {}),
      ...(typeof isActive === 'boolean' ? { isActive } : {}),
      ...(typeof depositAmount === 'number' && depositAmount >= 0 ? { depositAmount: Math.round(depositAmount) } : {}),
    },
  });

  return NextResponse.json({ success: true, category }, { status: 200 });
}

// حذف دسته‌بندی (خدمات داخلش هم با cascade حذف می‌شوند)
export async function DELETE(req: Request) {
  const result = await getOwnedSalonFromToken();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'آیدی ارسال نشده است' }, { status: 400 });

  const existing = await prisma.bookingCategory.findUnique({ where: { id } });
  if (!existing || existing.salonId !== result.salon.id) {
    return NextResponse.json({ error: 'دسته‌بندی یافت نشد' }, { status: 404 });
  }

  await prisma.bookingCategory.delete({ where: { id } });
  return NextResponse.json({ success: true }, { status: 200 });
}