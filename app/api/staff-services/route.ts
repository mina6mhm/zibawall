// app/api/staff-services/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

async function getSalonFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return await prisma.salon.findUnique({ where: { userId: decoded.userId } });
  } catch {
    return null;
  }
}

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


// ─────────────────────────────────────────────────────────────────────────────
// app/api/staff-overrides/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// (این فایل جداگانه باید ساخته شود)
//
// POST: ثبت یا بروزرسانی override ساعت کاری پرسنل در یک تاریخ خاص
//
// import { NextResponse } from 'next/server';
// import { cookies } from 'next/headers';
// import jwt from 'jsonwebtoken';
// import { prisma } from '@/lib/prisma';
//
// export async function POST(req: Request) {
//   // احراز هویت مشابه بالا
//   const { staffId, date, isDayOff, start, end, note } = await req.json();
//
//   if (!staffId || !date) return NextResponse.json({ error: 'staffId و date الزامی است' }, { status: 400 });
//
//   const override = await prisma.staffScheduleOverride.upsert({
//     where: { staffId_date: { staffId, date } },
//     create: { staffId, date, isDayOff: !!isDayOff, start: start || null, end: end || null, note: note || null },
//     update: { isDayOff: !!isDayOff, start: start || null, end: end || null, note: note || null },
//   });
//
//   return NextResponse.json({ override });
// }