// app/api/booking-online/reserve/route.ts
import { NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import type { BookingService, Staff } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { BOOKING_APP_FEE } from '@/lib/constants';
import {
  isLockTimeoutError,
  isSlotInPast,
  lockSalonDay,
  timeToMin,
  validateSlotAgainstSchedule,
} from '@/lib/bookingSchedule';
import { notifyBookingConfirmed } from '@/lib/bookingNotifications';
import { rateLimit } from '@/lib/rateLimit';
import { isHHMM, isIsoDate, parseJsonBody } from '@/lib/http';

// سقف تعداد خدمات در یک سبد؛ قبلاً بی‌نهایت بود و هر آیتم چند کوئری دیتابیس می‌زد
const MAX_CART_ITEMS = 10;

type ReserveItem = {
  serviceId: string;
  staffId?: string;
  date: string;      // "YYYY-MM-DD"
  startTime: string; // "HH:MM"
};

class SlotConflictError extends Error {}
class ScheduleError extends Error {}

const MAX_TX_ATTEMPTS = 4;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (!token) return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!, { algorithms: ['HS256'] });
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    if (typeof decoded?.userId !== 'string' || !decoded.userId) {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    // ضد اسپم/رزرو الکی: ۲۰ تلاش رزرو در ۱۰ دقیقه برای هر کاربر
    const limit = await rateLimit(`reserve:${decoded.userId}`, 20, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'تعداد تلاش‌ها زیاد است. کمی بعد دوباره تلاش کنید' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });

    // JSON خراب/خالی قبلاً به catch بیرونی می‌رسید و ۵۰۰ می‌شد؛ حالا ۴۰۰
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;
    const { salonId, items: rawItems } = parsed.body;

    if (typeof salonId !== 'string' || !salonId || !Array.isArray(rawItems) || rawItems.length === 0) {
      return NextResponse.json({ error: 'اطلاعات ناقص است' }, { status: 400 });
    }
    if (rawItems.length > MAX_CART_ITEMS) {
      return NextResponse.json(
        { error: `در هر رزرو حداکثر ${MAX_CART_ITEMS} خدمت مجاز است` },
        { status: 400 }
      );
    }

    // شکل هر آیتم سبد را قبل از هر کوئری دیتابیس چک می‌کنیم: آیتم null/غیرآبجکت، تاریخ یا ساعت
    // خراب قبلاً TypeError یا خطای Prisma (۵۰۰) می‌ساخت
    const items: ReserveItem[] = [];
    for (const raw of rawItems) {
      const it = raw as Record<string, unknown> | null;
      if (
        !it ||
        typeof it !== 'object' ||
        typeof it.serviceId !== 'string' ||
        !it.serviceId ||
        !isIsoDate(it.date) ||
        !isHHMM(it.startTime) ||
        (it.staffId !== undefined && it.staffId !== null && typeof it.staffId !== 'string')
      ) {
        return NextResponse.json({ error: 'اطلاعات یکی از خدمات ناقص یا نامعتبر است' }, { status: 400 });
      }
      items.push({
        serviceId: it.serviceId,
        staffId: (it.staffId as string | null | undefined) || undefined,
        date: it.date,
        startTime: it.startTime,
      });
    }

    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    if (!salon || !salon.bookingEnabled) {
      return NextResponse.json({ error: 'سیستم نوبت‌دهی این سالن فعال نیست' }, { status: 400 });
    }

    // اعتبارسنجی و تعیین پرسنل هر آیتم سبد
    const prepared: {
      item: ReserveItem;
      service: BookingService;
      staff: Staff;
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
        // این مسیر فقط یه شبکه‌ی امنیتیه (فرانت‌اند همیشه staffId مشخص می‌فرسته)؛
        // اینجا هم به‌جای همیشه اولین نفر (name asc)، رندوم انتخاب می‌کنیم تا
        // با منطق فرانت‌اند (پخش عادلانه‌ی نوبت‌ها بین پرسنل) هماهنگ باشه
        const eligibleStaffList = await prisma.staff.findMany({
          where: { salonId, bookingServices: { some: { bookingServiceId: item.serviceId } } },
        });
        if (eligibleStaffList.length === 0) {
          return NextResponse.json({ error: 'پرسنل مناسبی یافت نشد' }, { status: 400 });
        }
        assignedStaff = eligibleStaffList[Math.floor(Math.random() * eligibleStaffList.length)];
      }

      // ── چک ساعت کاری سالن/پرسنل + گذشته نبودن زمان ──────────────────────
      // این همان چکی است که available-slots برای نمایش لیست انجام می‌دهد؛
      // اینجا هم اجرا می‌شود تا کسی نتواند مستقیم به این API درخواست بزند
      // و برای ساعتی خارج از ساعت کاری یا روز مرخصی پرسنل نوبت بگیرد.
      const scheduleCheck = await validateSlotAgainstSchedule({
        salon,
        staff: assignedStaff,
        dateStr: item.date,
        startTime: item.startTime,
        durationMin: service.durationMin,
      });
      if (!scheduleCheck.ok) {
        return NextResponse.json({ error: scheduleCheck.error }, { status: 400 });
      }

      const startMin = timeToMin(item.startTime);
      const endMin = startMin + service.durationMin;

      prepared.push({ item, service, staff: assignedStaff, startMin, endMin });
    }

    // محاسبه مبالغ کل سبد — هزینه پلتفرم فقط یک بار روی کل گروه
    // نکته: BookingService فیلد depositAmount ندارد (فقط مدل Booking این فیلد
    // را دارد)، پس فعلاً بیعانه‌ی سطح خدمت وجود ندارد و همیشه صفر است.
    // اگر در آینده بیعانه‌ی واقعی روی خدمات اضافه شد، اینجا باید از
    // service.depositAmount خوانده شود (بعد از افزودن فیلد به schema.prisma).
    const totalDeposit = 0;
    const appFee = BOOKING_APP_FEE;
    const totalAmount = totalDeposit + appFee;

    const holdExpiresAt = totalAmount > 0 ? new Date(Date.now() + 10 * 60 * 1000) : null;
    const dates = Array.from(new Set(prepared.map((p) => p.item.date)));

    // بررسی تداخل + ساخت رزرو، همه داخل یک تراکنش Serializable
    // تا اگه دو درخواست همزمان برای یک پرسنل/ساعت بیان، فقط یکی موفق بشه
    // (چک قبلی که بیرون از تراکنش بود race condition داشت: هر دو درخواست
    // می‌تونستن قبل از commit شدن اولی از چک تداخل رد بشن)
    // روزهای درگیر به ترتیب ثابت قفل می‌شوند (مثل مسیر verify): درخواست‌های هم‌زمان برای یک
    // سالن/روز پشت سر هم می‌ایستند و دو تراکنش با ترتیب معکوس قفل، deadlock نمی‌سازند
    const lockDays = Array.from(new Set(prepared.map((p) => p.item.date))).sort();

    const runReserveTx = () =>
      prisma.$transaction(
        async (tx) => {
          for (const d of lockDays) await lockSalonDay(tx, salonId, d);

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
          // هولدهای پرداخت‌نشده‌ی خودِ همین کاربر برای همین تاریخ‌ها — این‌ها نباید
          // مانع تلاش دوباره‌اش بشن (مثلاً وقتی بار قبل پرداخت کامل نشده)، ولی چون
          // داره دوباره هولد می‌گیره، هولد قبلی‌شو کنسل می‌کنیم.
          // نکته‌ی مهم: فقط PENDING_PAYMENT «هولد» حساب می‌شه. نوبت‌های CONFIRMED
          // خودِ کاربر مثل نوبت‌های بقیه اسلات رو اشغال می‌کنن و هیچ‌وقت کنسل نمی‌شن.
          const ownStaleBookingIds: string[] = [];

          for (const b of existingBookings) {
            if (b.customerId === user.id && b.status === 'PENDING_PAYMENT') {
              ownStaleBookingIds.push(b.id);
              continue;
            }
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
            // گذشته نبودن زمان را دوباره داخل تراکنش هم چک می‌کنیم (نه فقط
            // بیرون از تراکنش)، چون ممکنه بین شروع درخواست و رسیدن به این‌جا
            // چند دقیقه طول کشیده باشه و اسلات درخواستی همین حین گذشته باشه.
            // (با isSlotInPast: ساعت نوبت به وقت تهران است؛ قبلاً با Z/UTC مقایسه می‌شد و تا ۳.۵ ساعت اشتباه بود)
            if (isSlotInPast(p.item.date, p.item.startTime)) {
              throw new ScheduleError(`ساعت ${p.item.startTime} در تاریخ ${p.item.date} گذشته است`);
            }

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

          // هولدهای قبلیِ خودِ همین کاربر برای همین سالن/تاریخ‌ها رو کنسل می‌کنیم
          // (مثلاً هولدی که بار قبل ساخته شده ولی پرداختش کامل نشده بود) — چون
          // داره از نو هولد می‌گیره، دیگه نیازی به نگه‌داشتن اون هولد قدیمی نیست
          if (ownStaleBookingIds.length > 0) {
            const staleGroups = await tx.booking.findMany({
              where: { id: { in: ownStaleBookingIds } },
              select: { bookingGroupId: true },
            });
            const staleGroupIds = Array.from(
              new Set(staleGroups.map((b) => b.bookingGroupId).filter((id): id is string => !!id))
            );

            await tx.booking.updateMany({
              where: { id: { in: ownStaleBookingIds }, status: 'PENDING_PAYMENT' },
              data: { status: 'CANCELLED' },
            });
            if (staleGroupIds.length > 0) {
              await tx.bookingGroup.updateMany({
                where: { id: { in: staleGroupIds } },
                data: { paymentStatus: 'FAILED' },
              });
            }
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
                    // درصد پیش‌فرض پرسنل (در صورت تعریف) به‌صورت اسنپ‌شات ثبت می‌شود؛
                    // سالن‌دار بعداً می‌تواند از صفحه‌ی نوبت‌ها برای این نوبت خاص تغییرش دهد
                    ...(p.staff.commissionPercent != null ? { staffPercentage: p.staff.commissionPercent } : {}),
                  },
                ],
                depositAmount: 0,
                appFee: 0,
                totalAmount: 0,
                status: totalAmount > 0 ? 'PENDING_PAYMENT' : 'CONFIRMED',
                paymentStatus: totalAmount > 0 ? 'PENDING' : 'SUCCESS',
                bookingGroupId: createdGroup.id,
                expiresAt: holdExpiresAt,
              },
            });
          }

          return createdGroup;
        },
        {
          // سطح ایزولاسیون عمداً پیش‌فرض (READ COMMITTED) است: درستیِ «بدون double-booking» را
          // lockSalonDay (advisory lock روی سالن/روز) تضمین می‌کند. Serializable با این قفل همراه شود
          // اسنپ‌شات را قبل از انتظار برای قفل می‌گیرد و درخواست‌های هم‌زمان را بی‌دلیل با P2034 رد می‌کند
          // (توضیح کامل: کامنت lockSalonDay در lib/bookingSchedule.ts).
          // زیر فشار، انتظار برای کانکشن/قفل از پیش‌فرض (۲ و ۵ ثانیه) بیشتر می‌شود
          maxWait: 10_000,
          timeout: 15_000,
        }
      );

    let group;
    try {
      // P2034 (تداخل Serializable) در ترافیک بالا طبیعی است و نباید به کاربر «همزمان یک نفر دیگر
      // رزرو کرد» نشان داده شود مگر اینکه واقعاً اسلات پر شده باشد؛ چند بار با تاخیر تصادفی تلاش می‌کنیم.
      // (تلاش مجدد، اسلات را با داده‌ی تازه چک می‌کند و تداخل واقعی را به‌صورت SlotConflictError می‌گیرد)
      for (let attempt = 1; ; attempt++) {
        try {
          group = await runReserveTx();
          break;
        } catch (e: any) {
          if (e?.code === 'P2034' && attempt < MAX_TX_ATTEMPTS) {
            await sleep(40 * attempt + Math.random() * 120);
            continue;
          }
          throw e;
        }
      }
    } catch (err: any) {
      if (err instanceof SlotConflictError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      if (err instanceof ScheduleError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      // P2034 = کانفلیکت write در تراکنش Serializable (دو درخواست همزمان با هم تداخل کردن)
      if (err?.code === 'P2034') {
        return NextResponse.json(
          { error: 'همزمان یک نفر دیگر همین ساعت را رزرو کرد، لطفاً دوباره تلاش کنید' },
          { status: 409 }
        );
      }
      // Pool دیتابیس پر است (P2024)، تراکنش بسته شد (P2028) یا مهلت انتظار برای قفل سالن/روز تمام شد:
      // سرور شلوغ است، نه خطای کاربر
      if (err?.code === 'P2024' || err?.code === 'P2028' || isLockTimeoutError(err)) {
        return NextResponse.json(
          { error: 'سرور در حال حاضر شلوغ است. چند ثانیه بعد دوباره تلاش کنید' },
          { status: 503, headers: { 'Retry-After': '3' } }
        );
      }
      throw err;
    }

    // اگر مبلغی برای پرداخت نیست، نوبت همین‌جا CONFIRMED شده → پیامک همین لحظه.
    // (در حالت پرداختی، پیامک بعد از موفق شدن پرداخت در booking-group/verify ارسال می‌شود.)
    if (group.paymentStatus === 'SUCCESS') {
      const origin = new URL(req.url).origin;
      after(() => notifyBookingConfirmed({ groupId: group.id, fallbackBaseUrl: origin }));
    }

    return NextResponse.json({ success: true, group }, { status: 201 });
  } catch (error) {
    console.error('Error creating online booking group:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت نوبت' }, { status: 500 });
  }
}