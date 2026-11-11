// app/api/staff-services/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';
import { rateLimit } from '@/lib/rateLimit';
import { parseJsonBody, tooManyRequests } from '@/lib/http';

// POST: تخصیص خدمت به پرسنل
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const limit = await rateLimit(`staff-services:${salon.id}`, 120, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { staffId, bookingServiceId } = parsed.body;

  if (typeof staffId !== 'string' || !staffId || typeof bookingServiceId !== 'string' || !bookingServiceId) {
    return NextResponse.json({ error: 'staffId و bookingServiceId الزامی است' }, { status: 400 });
  }

  // بررسی تعلق به همین سالن
  const [staffMember, service] = await Promise.all([
    prisma.staff.findUnique({ where: { id: staffId } }),
    prisma.bookingService.findUnique({ where: { id: bookingServiceId } }),
  ]);

  if (!staffMember || staffMember.salonId !== salon.id)
    return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });
  if (!service || service.salonId !== salon.id)
    return NextResponse.json({ error: 'خدمت یافت نشد' }, { status: 404 });

  await prisma.staffBookingService.upsert({
    where: { staffId_bookingServiceId: { staffId, bookingServiceId } },
    create: { staffId, bookingServiceId },
    update: {},
  });

  return NextResponse.json({ success: true }, { status: 201 });
}

// DELETE: حذف تخصیص خدمت از پرسنل
export async function DELETE(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { staffId, bookingServiceId } = parsed.body;

  if (typeof staffId !== 'string' || !staffId || typeof bookingServiceId !== 'string' || !bookingServiceId) {
    return NextResponse.json({ error: 'staffId و bookingServiceId الزامی است' }, { status: 400 });
  }

  // قبلاً مالکیت چک نمی‌شد: هر سالن‌داری با حدس شناسه‌ها می‌توانست تخصیص پرسنل «سالن دیگر» را حذف کند
  const staffMember = await prisma.staff.findFirst({
    where: { id: staffId, salonId: salon.id },
    select: { id: true },
  });
  if (!staffMember) return NextResponse.json({ error: 'پرسنل یافت نشد' }, { status: 404 });

  await prisma.staffBookingService.deleteMany({
    where: { staffId, bookingServiceId },
  });

  return NextResponse.json({ success: true });
}
