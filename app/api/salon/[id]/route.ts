// app/api/salon/[id]/route.ts
import { NextResponse } from 'next/server';
// قبلاً اینجا new PrismaClient() ساخته می‌شد: یعنی یک Pool اتصال «جداگانه» به دیتابیس
// (جدا از lib/prisma.ts). زیر فشار، دو Pool اتصال‌های دیتابیس را زودتر تمام می‌کرد.
import { prisma } from '@/lib/prisma';
import { rateLimit, getClientIp } from '@/lib/rateLimit';

// سقف تعداد نظرات برگشتی: سالن پرنظر نباید هر بار هزاران نظر را یک‌جا بفرستد
const MAX_REVIEWS = 200;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limit = await rateLimit(`salon-detail:${getClientIp(req)}`, 120, 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const { id: salonIdString } = await params;

    const salon = await prisma.salon.findUnique({
      where: { id: salonIdString },
      // شماره کارت بانکی صاحب سالن نباید در API عمومی باشد
      omit: { cardNumber: true, reminderSentAt: true },
      include: {
        socials: true,
        reviews: {
          orderBy: { createdAt: 'desc' }, // جدیدترین نظرات در بالا
          take: MAX_REVIEWS,
        },
      },
    });

    if (!salon) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    // اضافه کردن coordinates برای نمایش نقشه در صفحه جزئیات
    const formattedSalon = {
      ...salon,
      coordinates: salon.lat && salon.lng ? [salon.lat, salon.lng] : null,
    };

    return NextResponse.json(formattedSalon, {
      status: 200,
      headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' },
    });
  } catch (error) {
    console.error('Error fetching salon by id:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت اطلاعات سالن' }, { status: 500 });
  }
}
