// app/api/booking-online/reserve/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BOOKING_APP_FEE } from '@/lib/constants';

type ReserveItem = {
  serviceId: string;
  staffId?: string;
  date: string;      // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
};

function timeToMin(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

class SlotConflictError extends Error {}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    const body = await req.json();
    const { salonId, items } = body as { salonId?: string; items?: ReserveItem[] };

    if (!salonId || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon || !salon.bookingEnabled) {
      return NextResponse.json({ error: 'سیستم نوبت‌دهی این سالن فعال نیست' }, { status: 400 });
    }

    // اعتبارسنجی و تعیین پرسنل هر آیتم سبد
    const prepared: {
      item: ReserveItem;
      service: any;
      staff: any;
      startMin: number;
      endMin: number;
    }[] = [];

    for (const item of items) {
      if (!item.serviceId || !item.date || !item.startTime) {
        return NextResponse.json({ error: 'اطلاعات یکی از خدمات ناقص است' }, { status: 400 });
      }

      const service = await prisma.bookingService.findUnique({ where: { id: item.serviceId } });
      if (!service || service.salonId !== salonId || !service.isActive) {
        return NextResponse.json({ error: 'یکی از خدمات انتخابی یافت نشد' }, { status: 404 });
      }

      let assignedStaff;
      if (item.staffId) {
        assignedStaff = await prisma.staff.findFirst({
          where: { id: item.staffId, salonId, bookingServices: { some: { bookingServiceId: item.serviceId } } },
        });
        if (!assignedStaff) {
          return NextResponse.json({ error: 'پرسنل انتخابی برای این خدمت در دسترس نیست' }, { status: 400 });
        }
      } else {
        assignedStaff = await prisma.staff.findFirst({
          where: { salonId, bookingServices: { some: { bookingServiceId: item.serviceId } } },
          orderBy: { name: 'asc' },
        });
        if (!assignedStaff) {
          return NextResponse.json({ error: 'پرسنل مناسبی یافت نشد' }, { status: 400 });
        }
      }

      const startMin = timeToMin(item.startTime);
      const endMin = startMin + service.durationMin;

      prepared.push({ item, service, staff: assignedStaff, startMin, endMin });
    }

    // محاسبه مبالغ کل سبد — هزینه پلتفرم فقط یک بار روی کل گروه
    const totalDeposit = prepared.reduce((acc, p) => acc + (p.service.depositAmount ?? 0), 0);
    const appFee = BOOKING_APP_FEE;
    const totalAmount = totalDeposit + appFee;

    const holdExpiresAt = totalAmount > 0 ? new Date(Date.now() + 10 * 60 * 1000) : null;
    const dates = Array.from(new Set(prepared.map((p) => p.item.date)));

    // بررسی تداخل + ساخت رزرو، همه داخل یک تراکنش Serializable
    // تا اگه دو درخواست همزمان برای یک پرسنل/ساعت بیان، فقط یکی موفق بشه
    // (چک قبلی که بیرون از تراکنش بود race condition داشت: هر دو درخواست
    // می‌تونستن قبل از commit شدن اولی از چک تداخل رد بشن)
    let group;
    try {
      group = await prisma.$transaction(
        async (tx) => {
          const now = new Date();
          const existingBookings = await tx.booking.findMany({
            where: {
              salonId,
              date: { in: dates.map((d) => new Date(d + 'T00:00:00Z')) },
              OR: [
                { status: 'CONFIRMED' },
                { status: 'PENDING_PAYMENT', expiresAt: { gt: now } },
              ],
            },
          });

          const busyByStaffDate: Record<string, { start: number; end: number }[]> = {};

          for (const b of existingBookings) {
            const services = b.services as any[];
            const dStr = new Date(b.date).toISOString().slice(0, 10);
            const bStart = timeToMin(b.startTime);
            const bDuration = services.reduce((acc: number, sv: any) => acc + (sv.durationMin ?? 60), 0);
            services.forEach((sv: any) => {
              if (!sv.staffId) return;
              const key = `${sv.staffId}_${dStr}`;
              if (!busyByStaffDate[key]) busyByStaffDate[key] = [];
              busyByStaffDate[key].push({ start: bStart, end: bStart + bDuration });
            });
          }

          for (const p of prepared) {
            const key = `${p.staff.id}_${p.item.date}`;
            const ranges = busyByStaffDate[key] ?? [];
            const conflict = ranges.some((r) => p.startMin < r.end && p.endMin > r.start);
            if (conflict) {
              // خطای معمولی throw می‌کنیم تا کل تراکنش rollback بشه؛ پایین‌تر گرفته می‌شه
              throw new SlotConflictError(
                `ساعت ${p.item.startTime} برای ${p.staff.name} در دسترس نیست`
              );
            }
            // برای جلوگیری از تداخل بین آیتم‌های همین سبد
            if (!busyByStaffDate[key]) busyByStaffDate[key] = [];
            busyByStaffDate[key].push({ start: p.startMin, end: p.endMin });
          }

          const createdGroup = await tx.bookingGroup.create({
            data: {
              salonId,
              customerId: user.id,
              customerPhone: user.phone ?? '',
              customerName: user.name,
              totalDeposit,
              appFee,
              totalAmount,
              paymentStatus: totalAmount > 0 ? 'PENDING' : 'SUCCESS',
              expiresAt: holdExpiresAt,
            },
          });

          for (const p of prepared) {
            await tx.booking.create({
              data: {
                salonId,
                customerId: user.id,
                customerName: user.name,
                customerPhone: user.phone ?? '',
                date: new Date(p.item.date + 'T00:00:00Z'),
                startTime: p.item.startTime,
                services: [
                  {
                    name: p.service.name,
                    price: p.service.price,
                    durationMin: p.service.durationMin,
                    staffId: p.staff.id,
                    staffName: p.staff.name,
                  },
                ],
                depositAmount: p.service.depositAmount ?? 0,
                appFee: 0,
                totalAmount: p.service.depositAmount ?? 0,
                status: totalAmount > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED',
                paymentStatus: totalAmount > 0 ? 'PENDING' : 'SUCCESS',
                bookingGroupId: createdGroup.id,
                expiresAt: holdExpiresAt,
              },
            });
          }

          return createdGroup;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (err: any) {
      if (err instanceof SlotConflictError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      // P2034 = کانفلیکت write در تراکنش Serializable (دو درخواست همزمان با هم تداخل کردن)
      if (err?.code === 'P2034') {
        return NextResponse.json(
          { error: 'همزمان یک نفر دیگر همین ساعت را رزرو کرد، لطفاً دوباره تلاش کنید' },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    console.error('Error creating online booking group:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت نوبت' }, { status: 500 });
  }
}