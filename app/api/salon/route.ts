//app/api/salon/route.ts
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { notifyAdminNewSalonPending } from '@/lib/telegram';
import { notifyAdminNewSalonPendingPush } from '@/lib/push';

import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getSalonAccessForUserId } from '@/lib/salonAccess';
import { rateLimit } from '@/lib/rateLimit';
import {
  cleanString,
  cleanStringArray,
  cleanCoordinates,
  cleanTags,
  isHttpUrl,
} from '@/lib/validate';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'private, no-store' };

// ─────────────────────────────────────────────────────────────────────────────
// لیست عمومی سالن‌ها (صفحه‌ی اصلی) — پرترافیک‌ترین مسیر پروژه
//
// مشکلات قبلی:
//  ۱) برای هر درخواست، همه‌ی سالن‌ها + «همه‌ی نظرات همه‌ی سالن‌ها» (include reviews)
//     از دیتابیس کشیده می‌شد؛ با رشد نظرات، هر درخواست سنگین‌تر می‌شد.
//  ۲) هیچ کشی نبود: ۱۰ هزار کاربر هم‌زمان = ۱۰ هزار کوئری سنگین.
//  ۳) کل رکورد سالن (از جمله شماره کارت بانکی صاحب سالن) برای همه برگردانده می‌شد.
//
// راه‌حل:
//  - میانگین/تعداد امتیاز با «یک» کوئری groupBy برای همه‌ی سالن‌ها (به‌جای کشیدن نظرات)
//  - فیلدهای خصوصی/سنگین که صفحه‌ی لیست لازم ندارد حذف شد
//  - کش ۳۰ ثانیه‌ای در حافظه + single-flight: هزار درخواست هم‌زمان = یک کوئری
//  - هدر Cache-Control برای CDN/پروکسی
//  - اگر دیتابیس موقتاً خطا داد، نسخه‌ی قدیمیِ کش‌شده برمی‌گردد (به‌جای خطا)
// ─────────────────────────────────────────────────────────────────────────────
const LIST_TTL_MS = 30_000;

type ListEntry = { at: number; salons: unknown[] };
let listCache: ListEntry | null = null;
let listInflight: Promise<ListEntry> | null = null;

async function buildPublicList(): Promise<ListEntry> {
  const now = new Date();

  const [salons, stats] = await Promise.all([
    prisma.salon.findMany({
      where: {
        status: 'ACTIVE',
        subscriptionExpiresAt: { gt: now },
      },
      omit: {
        cardNumber: true,
        description: true,
        portfolios: true,
        phones: true,
        userId: true,
        rejectionReason: true,
        reviewedAt: true,
        reminderSentAt: true,
      },
    }),
    prisma.review.groupBy({
      by: ['salonId'],
      where: { rating: { gt: 0 } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  const statsBySalon = new Map(
    stats.map((s) => [s.salonId, { avg: s._avg.rating ?? 0, count: s._count._all }])
  );

  const withStats = salons.map((s) => {
    const st = statsBySalon.get(s.id);
    return {
      ...s,
      rating: st ? st.avg : s.rating,
      reviewsCount: st ? st.count : s.reviewsCount,
    };
  });

  const sorted = withStats.sort((a, b) => {
    // سالن‌های پین‌شده همیشه اول‌اند
    const aPinned = a.pinnedUntil && new Date(a.pinnedUntil) > now ? 1 : 0;
    const bPinned = b.pinnedUntil && new Date(b.pinnedUntil) > now ? 1 : 0;
    if (aPinned !== bPinned) return bPinned - aPinned;

    // بین چند سالن پین‌شده: تازه‌تر پین‌شده بالاتر
    if (aPinned && bPinned) {
      return new Date(b.pinnedAt as Date).getTime() - new Date(a.pinnedAt as Date).getTime();
    }

    const aAdvanced = a.planId === 'monthly-advanced' ? 1 : 0;
    const bAdvanced = b.planId === 'monthly-advanced' ? 1 : 0;
    if (aAdvanced !== bAdvanced) return bAdvanced - aAdvanced;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return { at: Date.now(), salons: sorted };
}

async function getPublicListCached(): Promise<unknown[]> {
  if (listCache && Date.now() - listCache.at < LIST_TTL_MS) return listCache.salons;

  if (!listInflight) {
    listInflight = buildPublicList()
      .then((entry) => {
        listCache = entry;
        return entry;
      })
      .finally(() => {
        listInflight = null;
      });
  }

  try {
    const entry = await listInflight;
    return entry.salons;
  } catch (err) {
    // دیتابیس موقتاً در دسترس نیست: نسخه‌ی قدیمی بهتر از خطاست
    if (listCache) return listCache.salons;
    throw err;
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // ── سالنِ خودِ کاربر لاگین‌شده (صفحه‌ی ویرایش کسب‌وکار) ───────────────────
    // قبلاً این مسیر بدون لاگین کار می‌کرد و با ?userPhone=09... اطلاعات سالن هر
    // کسی (از جمله شماره کارت) قابل خواندن بود. حالا هویت فقط از روی کوکی لاگین
    // تعیین می‌شود و مقدار userPhone که کلاینت می‌فرستد نادیده گرفته می‌شود.
    if (searchParams.has('userPhone')) {
      const auth = await getAuthUser();
      if ('error' in auth) {
        return NextResponse.json({ error: auth.error }, { status: auth.status, headers: NO_STORE });
      }

      const access = await getSalonAccessForUserId(auth.userId);
      if (!access) {
        return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404, headers: NO_STORE });
      }

      const salon = await prisma.salon.findUnique({
        where: { id: access.salon.id },
        include: { socials: true },
      });
      if (!salon) {
        return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404, headers: NO_STORE });
      }

      const formattedSalon = {
        ...salon,
        coordinates: salon.lat !== null && salon.lng !== null ? [salon.lat, salon.lng] : null,
      };

      return NextResponse.json({ salon: formattedSalon }, { status: 200, headers: NO_STORE });
    }

    // ── لیست عمومی ────────────────────────────────────────────────────────────
    const salons = await getPublicListCached();
    return NextResponse.json(
      { salons },
      {
        status: 200,
        headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' },
      }
    );
  } catch (error) {
    console.error('Error fetching salon(s):', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت اطلاعات' }, { status: 500, headers: NO_STORE });
  }
}

// ویرایش اطلاعات سالن (مالک یا مدیر سالن)
// قبلاً هیچ احراز هویتی نداشت و هرکسی با فرستادن userPhone دیگران می‌توانست سالنشان
// را ویرایش کند (حتی شماره کارت را عوض کند). حالا فقط با کوکی لاگین کار می‌کند.
export async function PUT(req: Request) {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const limit = await rateLimit(`salon-put:${auth.userId}`, 30, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'اطلاعات ارسالی نامعتبر است' }, { status: 400 });
    }

    const access = await getSalonAccessForUserId(auth.userId);
    const existingSalon = access?.salon ?? null;

    if (!existingSalon) {
      return NextResponse.json({ error: 'سالنی برای ویرایش یافت نشد' }, { status: 404 });
    }

    const maxPortfolios = existingSalon.planId === 'monthly-advanced' ? 30 : 10;

    if (Array.isArray(body.portfolios) && body.portfolios.length > maxPortfolios) {
      return NextResponse.json(
        { error: `حداکثر ${maxPortfolios} نمونه کار مجاز است` },
        { status: 400 }
      );
    }

    // ── اعتبارسنجی؛ فقط فیلدهایی که فرستاده شده‌اند آپدیت می‌شوند ─────────────
    const data: Prisma.SalonUpdateInput = {};
    const bad = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

    const requiredText: [string, number, 'name' | 'province' | 'city' | 'address' | 'workingHours'][] = [
      ['نام', 100, 'name'],
      ['استان', 60, 'province'],
      ['شهر', 60, 'city'],
      ['آدرس', 400, 'address'],
      ['ساعت کاری', 300, 'workingHours'],
    ];
    for (const [label, max, key] of requiredText) {
      if (body[key] === undefined) continue;
      const v = cleanString(body[key], max);
      if (!v) return bad(`${label} نامعتبر است (خالی یا بیش از ${max} کاراکتر)`);
      data[key] = v;
    }

    if (body.description !== undefined) {
      const v = cleanString(body.description, 3000);
      if (v === null) return bad('توضیحات نامعتبر است (حداکثر ۳۰۰۰ کاراکتر)');
      data.description = v;
    }

    if (body.phones !== undefined) {
      const phones = cleanStringArray(body.phones, 5, 20);
      if (phones.length === 0) return bad('حداقل یک شماره تماس الزامی است');
      data.phones = phones;
    }

    if (body.neighborhoods !== undefined) data.neighborhoods = cleanStringArray(body.neighborhoods, 60, 60);
    if (body.closedDays !== undefined) data.closedDays = cleanStringArray(body.closedDays, 7, 20);

    if (body.hasHomeService !== undefined) data.hasHomeService = !!body.hasHomeService;
    if (body.genderAudience !== undefined) {
      if (!['FEMALE', 'MALE', 'BOTH'].includes(body.genderAudience)) return bad('مخاطب سالن نامعتبر است');
      data.genderAudience = body.genderAudience;
    }

    if (body.cardNumber !== undefined) {
      const c = typeof body.cardNumber === 'string' ? body.cardNumber.trim() : '';
      if (c !== '' && !/^\d{16}$/.test(c)) return bad('شماره کارت باید دقیقاً ۱۶ رقم باشد');
      data.cardNumber = c;
    }

    if (body.tags !== undefined) data.tags = cleanTags(body.tags) as Prisma.InputJsonValue;

    if (body.imageUrl !== undefined) {
      if (!isHttpUrl(body.imageUrl)) return bad('آدرس عکس کاور نامعتبر است');
      data.imageUrl = body.imageUrl;
    }

    if (body.portfolios !== undefined) {
      data.portfolios = (Array.isArray(body.portfolios) ? body.portfolios : [])
        .filter((u: unknown) => isHttpUrl(u))
        .slice(0, maxPortfolios);
    }

    if (body.coordinates !== undefined) {
      const c = cleanCoordinates(body.coordinates);
      data.lat = c ? c[0] : null;
      data.lng = c ? c[1] : null;
    }

    if (body.socials && typeof body.socials === 'object') {
      const s = (k: string) => cleanString(body.socials[k], 200) || null;
      const socialData = {
        website: s('website'),
        instagram: s('instagram'),
        whatsapp: s('whatsapp'),
        telegram: s('telegram'),
        rubika: s('rubika'),
        bale: s('bale'),
      };
      data.socials = { upsert: { create: socialData, update: socialData } };
    }

    // اگر سالن قبلاً رد شده بود، ویرایش اطلاعات یعنی درخواست بررسی مجدد از ادمین
    if (existingSalon.status === 'REJECTED') {
      data.status = 'PENDING_APPROVAL';
      data.rejectionReason = null;
      data.reviewedAt = null;
    }

    const updatedSalon = await prisma.salon.update({
      where: { id: existingSalon.id },
      data,
    });

    if (existingSalon.status === 'REJECTED') {
      notifyAdminNewSalonPending({
        id: updatedSalon.id,
        name: updatedSalon.name,
        province: updatedSalon.province,
        city: updatedSalon.city,
        isResubmission: true,
      }).catch((err) => console.error('Telegram notify error:', err));

      notifyAdminNewSalonPendingPush({
        name: updatedSalon.name,
        province: updatedSalon.province,
        city: updatedSalon.city,
        isResubmission: true,
      }).catch((err) => console.error('Web push notify error:', err));
    }

    // کش لیست عمومی را بی‌اعتبار کن تا تغییر زودتر دیده شود
    listCache = null;

    return NextResponse.json({ success: true, salon: updatedSalon }, { status: 200 });
  } catch (error) {
    console.error('Error updating salon:', error);
    return NextResponse.json({ error: 'خطای سرور در بروزرسانی اطلاعات' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'آیدی کسب‌وکار ارسال نشده است' }, { status: 400 });
    }

    const salon = await prisma.salon.findUnique({ where: { id } });
    if (!salon) {
      return NextResponse.json({ error: 'کسب‌وکاری یافت نشد' }, { status: 404 });
    }

    // نقش ادمین از دیتابیس خوانده می‌شود، نه از توکن (توکن ۳۰ روز اعتبار دارد و
    // اگر نقش کسی بعداً برداشته شود، توکن قدیمی هنوز ادعای ADMIN می‌کند)
    const dbUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { role: true },
    });
    const isAdmin = dbUser?.role === 'ADMIN';
    const isOwner = auth.userId === salon.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: 'شما اجازه حذف این کسب‌وکار را ندارید' }, { status: 403 });
    }

    await prisma.salon.delete({ where: { id } });
    listCache = null;

    return NextResponse.json(
      { success: true, message: 'کسب‌وکار با موفقیت کامل حذف شد' },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'خطای سرور در حذف کسب‌وکار' }, { status: 500 });
  }
}
