// app/api/salon/managers/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { getSalonAccessForUserId } from '@/lib/salonAccess';

const mobileRegex = /^09\d{9}$/;

// فقط صاحب اصلیِ سالن اجازه دارد لیست مدیران را ببیند/تغییر دهد —
// خودِ مدیرها نباید بتوانند مدیر دیگری اضافه یا حذف کنند
async function requireOwnedSalon() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return { error: 'ابتدا وارد حساب کاربری شوید', status: 401 as const };

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return { error: 'توکن نامعتبر است', status: 401 as const };
  }

  const access = await getSalonAccessForUserId(decoded.userId);

  if (!access) return { error: 'شما سالنی ثبت نکرده‌اید', status: 404 as const };
  if (!access.isOwner) {
    return { error: 'فقط صاحب اصلی کسب‌وکار می‌تواند مدیران را مدیریت کند', status: 403 as const };
  }

  return { salon: access.salon };
}

// GET: لیست مدیران اضافه‌شده
export async function GET() {
  const result = await requireOwnedSalon();
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const managers = await prisma.salonManager.findMany({
    where: { salonId: result.salon.id },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json({ managers }, { status: 200 });
}

// POST: افزودن مدیر جدید با شماره موبایل
export async function POST(req: Request) {
  const result = await requireOwnedSalon();
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = await req.json();
  const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
  const label = typeof body?.label === 'string' && body.label.trim() ? body.label.trim() : null;

  if (!mobileRegex.test(phone)) {
    return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 });
  }

  const owner = await prisma.user.findUnique({ where: { id: result.salon.userId } });
  if (owner?.phone === phone) {
    return NextResponse.json({ error: 'این شماره همان شماره‌ی خودتان است' }, { status: 400 });
  }

  const existing = await prisma.salonManager.findUnique({
    where: { salonId_phone: { salonId: result.salon.id, phone } },
  });
  if (existing) {
    return NextResponse.json({ error: 'این شماره قبلاً به‌عنوان مدیر اضافه شده است' }, { status: 400 });
  }

  const manager = await prisma.salonManager.create({
    data: { salonId: result.salon.id, phone, label },
  });

  return NextResponse.json({ success: true, manager }, { status: 201 });
}

// DELETE: حذف یک مدیر — از این پس آن شماره دیگر دسترسی نخواهد داشت
export async function DELETE(req: Request) {
  const result = await requireOwnedSalon();
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'آیدی مدیر ارسال نشده است' }, { status: 400 });
  }

  const manager = await prisma.salonManager.findUnique({ where: { id } });
  if (!manager || manager.salonId !== result.salon.id) {
    return NextResponse.json({ error: 'مدیری یافت نشد' }, { status: 404 });
  }

  await prisma.salonManager.delete({ where: { id } });

  return NextResponse.json({ success: true }, { status: 200 });
}