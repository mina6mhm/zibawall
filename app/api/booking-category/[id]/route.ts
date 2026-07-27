// app/api/booking-category/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyOwnership(userPhone: string, categoryId: string) {
  const user = await prisma.user.findUnique({ where: { phone: userPhone } });
  if (!user) return { error: 'کاربر یافت نشد.', status: 404 } as const;

  const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
  if (!salon) return { error: 'کسب‌وکاری یافت نشد.', status: 404 } as const;

  const category = await prisma.bookingCategory.findUnique({ where: { id: categoryId } });
  if (!category || category.salonId !== salon.id) {
    return { error: 'دسته‌بندی یافت نشد.', status: 404 } as const;
  }

  return { salon, category };
}

// تغییر نام دسته
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { userPhone, name } = body;

    if (!userPhone || !name?.trim()) {
      return NextResponse.json({ error: 'نام و شماره کاربر الزامی است.' }, { status: 400 });
    }

    const check = await verifyOwnership(userPhone, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    const duplicate = await prisma.bookingCategory.findFirst({
      where: { salonId: check.salon.id, name: name.trim(), NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'دسته‌ای با این نام قبلاً ثبت شده است.' }, { status: 409 });
    }

    const category = await prisma.bookingCategory.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'خطا در ویرایش دسته‌بندی' }, { status: 500 });
  }
}

// حذف دسته (ریزخدمات زیرمجموعه هم به‌خاطر onDelete: Cascade حذف می‌شوند)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');

    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const check = await verifyOwnership(userPhone, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    await prisma.bookingCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'خطا در حذف دسته‌بندی' }, { status: 500 });
  }
}