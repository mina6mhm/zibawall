// app/api/booking-services/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';
import { rateLimit } from '@/lib/rateLimit';
import { intInRange, parseJsonBody, tooManyRequests } from '@/lib/http';

const MAX_SERVICES_PER_SALON = 200;
const MAX_NAME_LENGTH = 100;
const MAX_DURATION_MIN = 24 * 60;
const MAX_PRICE = 1_000_000_000;

// GET: لیست خدمات نوبت‌دهی سالن
export async function GET() {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const services = await prisma.bookingService.findMany({
    where: { salonId: salon.id },
    include: { staffMembers: true },
    orderBy: { createdAt: 'asc' },
    take: MAX_SERVICES_PER_SALON,
  });

  return NextResponse.json({ services });
}

// POST: افزودن خدمت جدید
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const limit = await rateLimit(`booking-service-add:${salon.id}`, 60, 10 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { name, durationMin, price } = parsed.body;

  const cleanName = typeof name === 'string' ? name.trim() : '';
  if (!cleanName) return NextResponse.json({ error: 'نام خدمات الزامی است' }, { status: 400 });
  if (cleanName.length > MAX_NAME_LENGTH) {
    return NextResponse.json({ error: `نام خدمت نباید بیش از ${MAX_NAME_LENGTH} کاراکتر باشد` }, { status: 400 });
  }

  const duration = intInRange(durationMin, 1, MAX_DURATION_MIN);
  if (duration === null) return NextResponse.json({ error: 'مدت زمان نامعتبر است' }, { status: 400 });

  // قیمت اختیاری است (خالی = ۰)
  const cleanPrice = price === undefined || price === null || price === '' ? 0 : intInRange(price, 0, MAX_PRICE);
  if (cleanPrice === null) return NextResponse.json({ error: 'قیمت نامعتبر است' }, { status: 400 });

  const count = await prisma.bookingService.count({ where: { salonId: salon.id } });
  if (count >= MAX_SERVICES_PER_SALON) {
    return NextResponse.json(
      { error: `حداکثر ${MAX_SERVICES_PER_SALON} خدمت قابل تعریف است` },
      { status: 400 }
    );
  }

  const service = await prisma.bookingService.create({
    data: {
      salonId: salon.id,
      name: cleanName,
      durationMin: duration,
      price: cleanPrice,
    },
  });

  return NextResponse.json({ service }, { status: 201 });
}
