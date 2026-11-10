// app/api/business/create-pending/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { cleanString, cleanStringArray, cleanCoordinates, cleanTags, isHttpUrl } from '@/lib/validate';
import { notifyAdminNewSalonPending } from '@/lib/telegram';
import { notifyAdminNewSalonPendingPush } from '@/lib/push';

// این مسیر سالن را بدون پرداخت می‌سازد ولی آن را مستقیم پابلیک نمی‌کند (اشتراک/پلن فعلاً حذف شده است).
// سالن با status=PENDING_APPROVAL ساخته می‌شود و تا زمانی‌که ادمین از پنل مدیریت
// آن را تایید نکند، در GET /api/salon (صفحه اصلی، که فقط ACTIVE برمی‌گرداند) نمایش داده نمی‌شود.
// subscriptionExpiresAt عمداً به ۱۰۰ سال بعد تنظیم می‌شود تا بعد از تایید ادمین، فیلتر
// «ACTIVE و منقضی‌نشده»ی GET /api/salon بدون نیاز به تغییر schema یا آن فیلتر درست کار کند.
export async function POST(req: Request) {
  try {
    // قبلاً این مسیر لاگین نمی‌خواست و با userPhone هر کسی می‌شد «به‌نام دیگران» کسب‌وکار
    // ساخت؛ چون هر کاربر فقط یک سالن می‌تواند داشته باشد، قربانی دیگر نمی‌توانست ثبت‌نام کند.
    // حالا هویت فقط از کوکی لاگین گرفته می‌شود و userPhone نادیده گرفته می‌شود.
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const limit = rateLimit(`create-pending:${auth.userId}`, 5, 60 * 60 * 1000);
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
    const {
      neighborhoods, coordinates, phones, closedDays, hasHomeService, genderAudience,
      cardNumber, tags, description, socials, imageUrl, portfolios,
    } = body;

    const user = await prisma.user.findUnique({ where: { id: auth.userId } });
    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    const existingSalon = await prisma.salon.findUnique({ where: { userId: user.id } });
    if (existingSalon) {
      return NextResponse.json({ error: 'شما قبلاً یک کسب‌وکار ثبت کرده‌اید' }, { status: 400 });
    }

    const name = cleanString(body.name, 100);
    const province = cleanString(body.province, 60);
    const city = cleanString(body.city, 60);
    const address = cleanString(body.address, 400);
    const workingHours = cleanString(body.workingHours, 300);

    if (!name || !province || !city || !address || !workingHours) {
      return NextResponse.json({ error: 'اطلاعات پایه سالن ناقص یا نامعتبر است' }, { status: 400 });
    }

    const validPhones = cleanStringArray(phones, 5, 20);
    if (validPhones.length === 0) {
      return NextResponse.json({ error: 'حداقل یک شماره تماس الزامی است' }, { status: 400 });
    }

    if (cardNumber && !/^\d{16}$/.test(String(cardNumber))) {
      return NextResponse.json({ error: 'اگر شماره کارت وارد می‌کنید، باید دقیقاً ۱۶ رقم باشد' }, { status: 400 });
    }

    if (!isHttpUrl(imageUrl)) {
      return NextResponse.json({ error: 'عکس کاور الزامی است' }, { status: 400 });
    }

    const cleanDescription = cleanString(description, 3000);
    if (description !== undefined && description !== null && cleanDescription === null) {
      return NextResponse.json({ error: 'توضیحات بیش از حد طولانی است' }, { status: 400 });
    }

    // سقف ثابت نمونه‌کار — دیگر به پلن وابسته نیست
    const MAX_PORTFOLIOS = 15;
    const finalPortfolios = (Array.isArray(portfolios) ? portfolios : [])
      .filter((u: unknown) => isHttpUrl(u))
      .slice(0, MAX_PORTFOLIOS);
    const coords = cleanCoordinates(coordinates);
    const social = (k: string) => cleanString(socials?.[k], 200) || null;

    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);

    const salon = await prisma.salon.create({
      data: {
        name,
        province,
        city,
        neighborhoods: cleanStringArray(neighborhoods, 60, 60),
        address,
        lat: coords ? coords[0] : null,
        lng: coords ? coords[1] : null,
        phones: validPhones,
        workingHours,
        closedDays: cleanStringArray(closedDays, 7, 20),
        hasHomeService: !!hasHomeService,
        genderAudience: ['FEMALE', 'MALE', 'BOTH'].includes(genderAudience) ? genderAudience : 'BOTH',
        cardNumber: cardNumber ? String(cardNumber) : '',
        tags: cleanTags(tags),
        imageUrl,
        description: cleanDescription || 'توضیحات پیش‌فرض سالن',
        portfolios: finalPortfolios,
        status: 'PENDING_APPROVAL',
        planId: null,
        subscriptionExpiresAt: farFuture,
        userId: user.id,
        socials: {
          create: {
            website: social('website'),
            instagram: social('instagram'),
            whatsapp: social('whatsapp'),
            telegram: social('telegram'),
            rubika: social('rubika'),
            bale: social('bale'),
          },
        },
      },
    });

    // نوتیف آنی به ادمین از طریق تلگرام — عمداً await نمی‌شود که سرعت پاسخ به کاربر کم نشود
    notifyAdminNewSalonPending({
      id: salon.id,
      name: salon.name,
      province: salon.province,
      city: salon.city,
    }).catch((err) => console.error('Telegram notify error:', err));

    // نوتیف مستقیم از خود اپ به مرورگر ادمین‌ها (Web Push) — مستقل از تلگرام
    notifyAdminNewSalonPendingPush({
      name: salon.name,
      province: salon.province,
      city: salon.city,
    }).catch((err) => console.error('Web push notify error:', err));

    return NextResponse.json({ success: true, salon }, { status: 201 });
  } catch (error) {
    console.error('Error creating business:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت کسب‌وکار' }, { status: 500 });
  }
}