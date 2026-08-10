// app/api/business/create-pending/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const mobileRegex = /^09\d{9}$/;

// این مسیر سالن را مستقیماً و بدون پرداخت فعال می‌کند (اشتراک/پلن فعلاً حذف شده است).
// subscriptionExpiresAt عمداً به ۱۰۰ سال بعد تنظیم می‌شود تا فیلتر «ACTIVE و منقضی‌نشده»ی
// موجود در GET /api/salon (صفحه اصلی) بدون نیاز به تغییر schema یا آن فیلتر، به‌درستی کار کند.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userPhone, name, province, city, neighborhoods, address, coordinates,
      phones, workingHours, closedDays, hasHomeService, genderAudience,
      cardNumber, tags, description, socials, imageUrl, portfolios,
    } = body;

    if (!userPhone) {
      return NextResponse.json({ error: 'شماره کاربر ارسال نشده است' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { phone: userPhone } });
    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const existingSalon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (existingSalon) {
      return NextResponse.json({ error: 'شما قبلاً یک کسب‌وکار ثبت کرده‌اید' }, { status: 400 });
    }

    if (!name || !province || !city || !address || !workingHours) {
      return NextResponse.json({ error: 'اطلاعات پایه سالن ناقص است' }, { status: 400 });
    }

    const validPhones = Array.isArray(phones) ? phones.filter((p: string) => p?.trim()) : [];
    if (validPhones.length === 0) {
      return NextResponse.json({ error: 'حداقل یک شماره تماس الزامی است' }, { status: 400 });
    }

    if (!cardNumber || !/^\d{16}$/.test(cardNumber)) {
      return NextResponse.json({ error: 'شماره کارت باید دقیقاً ۱۶ رقم باشد' }, { status: 400 });
    }

    if (!imageUrl) {
      return NextResponse.json({ error: 'عکس کاور الزامی است' }, { status: 400 });
    }

    // سقف ثابت نمونه‌کار — دیگر به پلن وابسته نیست
    const MAX_PORTFOLIOS = 15;
    const finalPortfolios = Array.isArray(portfolios) ? portfolios.slice(0, MAX_PORTFOLIOS) : [];

    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);

    const salon = await prisma.salon.create({
      data: {
        name,
        province,
        city,
        neighborhoods: neighborhoods || [],
        address,
        lat: coordinates && coordinates.length === 2 ? coordinates[0] : null,
        lng: coordinates && coordinates.length === 2 ? coordinates[1] : null,
        phones: validPhones,
        workingHours,
        closedDays: closedDays || [],
        hasHomeService: !!hasHomeService,
        genderAudience: genderAudience || 'BOTH',
        cardNumber,
        tags: tags || [],
        imageUrl,
        description: description || 'توضیحات پیش‌فرض سالن',
        portfolios: finalPortfolios,
        status: 'ACTIVE',
        planId: null,
        subscriptionExpiresAt: farFuture,
        userId: user.id,
        socials: {
          create: {
            website: socials?.website || null,
            instagram: socials?.instagram || null,
            whatsapp: socials?.whatsapp || null,
            telegram: socials?.telegram || null,
            rubika: socials?.rubika || null,
            bale: socials?.bale || null,
          },
        },
      },
    });

    return NextResponse.json({ success: true, salon }, { status: 201 });
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت کسب‌وکار' }, { status: 500 });
  }
}