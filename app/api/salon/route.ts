//app/api/salon/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { notifyAdminNewSalonPending } from '@/lib/telegram';

import { prisma } from '@/lib/prisma';
import { getSalonAccessForUserId } from '@/lib/salonAccess';

// ۱. اضافه شدن این خط برای جلوگیری از کش شدن و نمایش دیتای لحظه‌ای
export const dynamic = 'force-dynamic';

// نکته: قبلاً اینجا checkSubscriptions() روی هر بار لود صفحه‌ی اصلی صدا زده می‌شد.
// چون سالن‌ها دیگه اشتراک ندارن (ثبت‌نام کاملاً رایگانه و subscriptionExpiresAt
// همیشه ۱۰۰ سال جلوتر ست می‌شه)، اون تابع عملاً هیچ‌وقت کاری انجام نمی‌داد و فقط
// یه query نوشتن/خوندن اضافه روی پرترافیک‌ترین مسیر پروژه بود — حذف شد.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userPhone = searchParams.get('userPhone');

    // اگر شماره تلفن ارسال نشده بود (دریافت همه سالن‌ها برای صفحه اصلی)
    if (!userPhone) {
      const allSalons = await prisma.salon.findMany({
  where: {
    status: 'ACTIVE',
    subscriptionExpiresAt: {
      gt: new Date(),
    },
  },
  include: {
    reviews: true,
  },
});
  
const now = new Date();

const sortedSalons = allSalons.sort((a, b) => {
  // سالن‌های پین‌شده (پرداخت برای نمایش اول در جستجو/فیلترها) همیشه اول‌اند —
  // مهم نیست چه سرچ یا فیلتری اعمال شده، چون این مرتب‌سازی همین‌جا روی کل
  // لیست انجام می‌شود و صفحه‌ی اصلی فقط با .filter() (که ترتیب را حفظ می‌کند)
  // روی همین آرایه‌ی مرتب‌شده جستجو/فیلتر می‌کند.
  const aPinned = a.pinnedUntil && new Date(a.pinnedUntil) > now ? 1 : 0;
  const bPinned = b.pinnedUntil && new Date(b.pinnedUntil) > now ? 1 : 0;

  if (aPinned !== bPinned) {
    return bPinned - aPinned;
  }

  // بین چند سالن پین‌شده: کسی که تازه‌تر پین کرده/تمدید کرده بالاتر است
  if (aPinned && bPinned) {
    return new Date(b.pinnedAt as Date).getTime() - new Date(a.pinnedAt as Date).getTime();
  }

  const aAdvanced = a.planId === 'monthly-advanced' ? 1 : 0;
  const bAdvanced = b.planId === 'monthly-advanced' ? 1 : 0;

  if (aAdvanced !== bAdvanced) {
    return bAdvanced - aAdvanced;
  }

  return (
    new Date(b.createdAt).getTime() -
    new Date(a.createdAt).getTime()
  );
});

return NextResponse.json(
  { salons: sortedSalons },
  { status: 200 }
);
  }
    const user = await prisma.user.findUnique({
      where: { phone: userPhone }
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const access = await getSalonAccessForUserId(user.id);

    if (!access) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    const salon = await prisma.salon.findUnique({
      where: { id: access.salon.id },
      include: { socials: true }
    });

    if (!salon) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    const formattedSalon = {
      ...salon,
      coordinates:
       salon.lat !== null &&
       salon.lng !== null
       ? [salon.lat, salon.lng]
       : null  
    };

    return NextResponse.json({ salon: formattedSalon }, { status: 200 });

  } catch (error) {
    console.error('Error fetching salon(s):', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت اطلاعات' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const user = await prisma.user.findUnique({
      where: { phone: body.userPhone }
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const access = await getSalonAccessForUserId(user.id);
    const existingSalon = access?.salon ?? null;

    if (!existingSalon) {
      return NextResponse.json({ error: 'سالنی برای ویرایش یافت نشد' }, { status: 404 });
    }

    const maxPortfolios =
  existingSalon.planId === 'monthly-advanced'
    ? 30
    : 10;

if (
  body.portfolios &&
  body.portfolios.length > maxPortfolios
) {
  return NextResponse.json(
    {
     error: `حداکثر ${maxPortfolios} نمونه کار مجاز است`
    },
    {
      status: 400
    }
  );
}
    // اگر سالن قبلاً رد شده بود، ویرایش اطلاعات یعنی درخواست بررسی مجدد از ادمین
    const resubmissionData =
      existingSalon.status === 'REJECTED'
        ? { status: 'PENDING_APPROVAL' as const, rejectionReason: null, reviewedAt: null }
        : {};

    const updatedSalon = await prisma.salon.update({
  where: { id: existingSalon.id },
  data: {
    ...resubmissionData,
    name: body.name,
    province: body.province,
    city: body.city,
    neighborhoods: body.neighborhoods || [],
    address: body.address,
    phones: body.phones,
    workingHours: body.workingHours,
    closedDays: body.closedDays,
    hasHomeService: !!body.hasHomeService,
    genderAudience: body.genderAudience || 'BOTH',
    cardNumber: body.cardNumber,
    tags: body.tags,
        description: body.description,
        imageUrl: body.imageUrl,
        portfolios: body.portfolios || [],
        
        lat: body.coordinates && body.coordinates.length === 2 ? body.coordinates[0] : null,
        lng: body.coordinates && body.coordinates.length === 2 ? body.coordinates[1] : null,
        
        socials: {
          upsert: {
            create: {
              website: body.socials?.website || null,
              instagram: body.socials?.instagram || null,
              whatsapp: body.socials?.whatsapp || null,
              telegram: body.socials?.telegram || null,
              rubika: body.socials?.rubika || null,
              bale: body.socials?.bale || null,
            },
            update: {
              website: body.socials?.website || null,
              instagram: body.socials?.instagram || null,
              whatsapp: body.socials?.whatsapp || null,
              telegram: body.socials?.telegram || null,
              rubika: body.socials?.rubika || null,
              bale: body.socials?.bale || null,
            }
          }
        }
      }
    });

    // اگر این ویرایش، یک "درخواست بررسی مجدد" بعد از رد شدن بود، به ادمین نوتیف بده
    if (existingSalon.status === 'REJECTED') {
      notifyAdminNewSalonPending({
        id: updatedSalon.id,
        name: updatedSalon.name,
        province: updatedSalon.province,
        city: updatedSalon.city,
        isResubmission: true,
      }).catch((err) => console.error('Telegram notify error:', err));
    }

    return NextResponse.json({ success: true, salon: updatedSalon }, { status: 200 });

  } catch (error) {
    console.error('Error updating salon:', error);
    return NextResponse.json({ error: 'خطای سرور در بروزرسانی اطلاعات' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // --- بررسی احراز هویت ---
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'ابتدا وارد حساب کاربری شوید' }, { status: 401 });
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch {
      return NextResponse.json({ error: 'توکن نامعتبر است' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'آیدی کسب‌وکار ارسال نشده است' },
        { status: 400 }
      );
    }

    const salon = await prisma.salon.findUnique({
      where: { id },
    });

    if (!salon) {
      return NextResponse.json(
        { error: 'کسب‌وکاری یافت نشد' },
        { status: 404 }
      );
    }

    // --- بررسی دسترسی: یا ادمین، یا خودِ صاحب سالن ---
    const isAdmin = decoded.role === 'ADMIN';
    const isOwner = decoded.userId === salon.userId;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'شما اجازه حذف این کسب‌وکار را ندارید' },
        { status: 403 }
      );
    }
    // --- پایان بررسی ---

    // تغییر این بخش: استفاده از delete به جای update
    await prisma.salon.delete({
      where: { id },
    });

    return NextResponse.json(
      {
        success: true,
        message: 'کسب‌وکار با موفقیت کامل حذف شد',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: 'خطای سرور در حذف کسب‌وکار',
      },
      {
        status: 500,
      }
    );
  }
}