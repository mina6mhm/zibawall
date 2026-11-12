// app/api/booking-services/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';
import { intInRange, parseJsonBody } from '@/lib/http';
import { isValidCardNumber, MAX_SERVICE_DEPOSIT } from '@/lib/deposit';

const MAX_NAME_LENGTH = 100;
const MAX_DURATION_MIN = 24 * 60;
const MAX_PRICE = 1_000_000_000;

// PUT: ویرایش خدمت
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.bookingService.findUnique({ where: { id } });
  if (!existing || existing.salonId !== salon.id)
    return NextResponse.json({ error: 'خدمتی یافت نشد' }, { status: 404 });

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { name, durationMin, price, depositAmount, isActive } = parsed.body;

  // قبلاً Number('abc') = NaN مستقیم به Prisma می‌رفت و ۵۰۰ می‌داد
  const data: { name?: string; durationMin?: number; price?: number; depositAmount?: number; isActive?: boolean } = {};

  if (name !== undefined) {
    const cleanName = typeof name === 'string' ? name.trim() : '';
    if (!cleanName || cleanName.length > MAX_NAME_LENGTH) {
      return NextResponse.json({ error: 'نام خدمت نامعتبر است' }, { status: 400 });
    }
    data.name = cleanName;
  }
  if (durationMin !== undefined) {
    const duration = intInRange(durationMin, 1, MAX_DURATION_MIN);
    if (duration === null) return NextResponse.json({ error: 'مدت زمان نامعتبر است' }, { status: 400 });
    data.durationMin = duration;
  }
  if (price !== undefined) {
    const cleanPrice = intInRange(price, 0, MAX_PRICE);
    if (cleanPrice === null) return NextResponse.json({ error: 'قیمت نامعتبر است' }, { status: 400 });
    data.price = cleanPrice;
  }
  if (depositAmount !== undefined) {
    const cleanDeposit = depositAmount === null || depositAmount === '' ? 0 : intInRange(depositAmount, 0, MAX_SERVICE_DEPOSIT);
    if (cleanDeposit === null) return NextResponse.json({ error: 'مبلغ بیعانه نامعتبر است' }, { status: 400 });
    data.depositAmount = cleanDeposit;
  }

  // بیعانه‌ی مثبت: نیازمند کارت معتبر و حداکثر برابر قیمت (با مقادیر نهایی، چه عوض شده چه نشده)
  const finalPrice = data.price ?? existing.price;
  const finalDeposit = data.depositAmount ?? existing.depositAmount;
  if (data.depositAmount !== undefined && finalDeposit > 0 && !isValidCardNumber(salon.cardNumber)) {
    return NextResponse.json({ error: 'برای تعیین بیعانه ابتدا شماره کارت ۱۶ رقمی سالن را ثبت کنید' }, { status: 400 });
  }
  if ((data.depositAmount !== undefined || data.price !== undefined) && finalDeposit > 0 && finalPrice > 0 && finalDeposit > finalPrice) {
    return NextResponse.json({ error: 'بیعانه نمی‌تواند از قیمت خدمت بیشتر باشد' }, { status: 400 });
  }
  if (isActive !== undefined) data.isActive = Boolean(isActive);

  const updated = await prisma.bookingService.update({ where: { id }, data });

  return NextResponse.json({ service: updated });
}

// DELETE: حذف خدمت
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.bookingService.findUnique({ where: { id } });
  if (!existing || existing.salonId !== salon.id)
    return NextResponse.json({ error: 'خدمتی یافت نشد' }, { status: 404 });

  await prisma.bookingService.deleteMany({ where: { id, salonId: salon.id } });
  return NextResponse.json({ success: true });
}
