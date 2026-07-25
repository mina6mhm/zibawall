//app/api/staff/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyOwnership(userPhone: string, staffId: string) {
  const user = await prisma.user.findUnique({ where: { phone: userPhone } });
  if (!user) return { error: 'کاربر یافت نشد.', status: 404 } as const;

  const salon = await prisma.salon.findUnique({ where: { userId: user.id } });
  if (!salon) return { error: 'کسب‌وکاری یافت نشد.', status: 404 } as const;

  const staff = await prisma.staff.findUnique({ where: { id: staffId } });
  if (!staff || staff.salonId !== salon.id) {
    return { error: 'پرسنل یافت نشد.', status: 404 } as const;
  }

  return { salon, staff };
}

// ویرایش نام پرسنل
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

    const duplicate = await prisma.staff.findFirst({
      where: { salonId: check.salon.id, name: name.trim(), NOT: { id } },
    });
    if (duplicate) {
      return NextResponse.json({ error: 'پرسنلی با این نام قبلاً ثبت شده است.' }, { status: 409 });
    }

    const staff = await prisma.staff.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error('Error updating staff:', error);
    return NextResponse.json({ error: 'خطا در ویرایش پرسنل' }, { status: 500 });
  }
}

// حذف پرسنل
// نکته: نام پرسنل داخل هر مراجعه‌ی قبلی به‌صورت snapshot ذخیره شده،
// پس حذف پرسنل، تاریخچه‌ی مراجعه‌های قبلی را از بین نمی‌برد.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');

    if (!userPhone) return NextResponse.json({ error: 'شماره کاربر الزامی است.' }, { status: 400 });

    const check = await verifyOwnership(userPhone, id);
    if ('error' in check) return NextResponse.json({ error: check.error }, { status: check.status });

    await prisma.staff.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting staff:', error);
    return NextResponse.json({ error: 'خطا در حذف پرسنل' }, { status: 500 });
  }
}

