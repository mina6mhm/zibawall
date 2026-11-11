// app/api/salon/managers/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getSalonAccessForUserId } from '@/lib/salonAccess';
import { normalizeDigits } from '@/lib/phone';
import { rateLimit } from '@/lib/rateLimit';
import { parseJsonBody, tooManyRequests } from '@/lib/http';

const mobileRegex = /^09\d{9}$/;
const MAX_MANAGERS_PER_SALON = 20;
const MAX_LABEL_LENGTH = 60;

// فقط صاحب اصلیِ سالن اجازه دارد لیست مدیران را ببیند/تغییر دهد —
// خودِ مدیرها نباید بتوانند مدیر دیگری اضافه یا حذف کنند
async function requireOwnedSalon() {
  const auth = await getAuthUser();
  if ('error' in auth) {
    return { error: auth.error, status: auth.status };
  }

  const access = await getSalonAccessForUserId(auth.userId);

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
    take: MAX_MANAGERS_PER_SALON + 10,
  });

  return NextResponse.json({ managers }, { status: 200 });
}

// POST: افزودن مدیر جدید با شماره موبایل
export async function POST(req: Request) {
  const result = await requireOwnedSalon();
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const limit = await rateLimit(`salon-managers:${result.salon.id}`, 20, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const body = parsed.body;

  // ارقام فارسی/عربی هم پذیرفته می‌شود (مثل مسیر ورود با OTP)
  const phone = normalizeDigits(body.phone);
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : null;

  if (!mobileRegex.test(phone)) {
    return NextResponse.json({ error: 'شماره موبایل معتبر نیست' }, { status: 400 });
  }
  if (label && label.length > MAX_LABEL_LENGTH) {
    return NextResponse.json(
      { error: `یادداشت نمی‌تواند بیش از ${MAX_LABEL_LENGTH} کاراکتر باشد` },
      { status: 400 }
    );
  }

  const owner = await prisma.user.findUnique({
    where: { id: result.salon.userId },
    select: { phone: true },
  });
  if (owner?.phone === phone) {
    return NextResponse.json({ error: 'این شماره همان شماره‌ی خودتان است' }, { status: 400 });
  }

  const count = await prisma.salonManager.count({ where: { salonId: result.salon.id } });
  if (count >= MAX_MANAGERS_PER_SALON) {
    return NextResponse.json(
      { error: `حداکثر ${MAX_MANAGERS_PER_SALON} مدیر قابل اضافه شدن است` },
      { status: 400 }
    );
  }

  try {
    const manager = await prisma.salonManager.create({
      data: { salonId: result.salon.id, phone, label },
    });
    return NextResponse.json({ success: true, manager }, { status: 201 });
  } catch (error) {
    // دو درخواست هم‌زمان با یک شماره: unique (salonId, phone) نقض می‌شود (قبلاً ۵۰۰ می‌شد)
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'این شماره قبلاً به‌عنوان مدیر اضافه شده است' }, { status: 400 });
    }
    console.error('Error adding salon manager:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
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

  await prisma.salonManager.deleteMany({ where: { id, salonId: result.salon.id } });

  return NextResponse.json({ success: true }, { status: 200 });
}
