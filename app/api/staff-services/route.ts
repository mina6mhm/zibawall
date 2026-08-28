// app/api/staff-services/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';

// POST: تخصیص خدمت به پرسنل
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const { staffId, bookingServiceId } = await req.json();

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

  const { staffId, bookingServiceId } = await req.json();

  await prisma.staffBookingService.deleteMany({
    where: { staffId, bookingServiceId },
  });

  return NextResponse.json({ success: true });
}