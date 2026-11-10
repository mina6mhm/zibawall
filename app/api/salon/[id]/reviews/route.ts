//app/api/salon/[id]/reviews/route.ts
import { NextResponse } from 'next/server';
// قبلاً new PrismaClient() جداگانه ساخته می‌شد (یک Pool اضافه‌ی اتصال به دیتابیس)
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';

const MAX_NAME = 60;
const MAX_COMMENT = 1000;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ── ورود الزامی است ─────────────────────────────────────────────────────
    // قبلاً هر کسی (بدون لاگین، با هر اسم دلخواه) می‌توانست بی‌نهایت نظر/امتیاز ثبت کند؛
    // یعنی امتیاز هر سالنی با یک اسکریپت ساده قابل دستکاری بود. حالا نام کاربر از روی
    // حساب لاگین‌شده خوانده می‌شود، نه از بدنه‌ی درخواست.
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json(
        { error: 'برای ثبت امتیاز و نظر ابتدا وارد حساب کاربری شوید' },
        { status: 401 }
      );
    }

    // ضد اسپم: ۲۰ ثبت در ۱۰ دقیقه برای هر کاربر
    const limit = rateLimit(`review:${auth.userId}`, 20, 10 * 60 * 1000);
    if (!limit.ok) {
      return NextResponse.json(
        { error: 'تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید' },
        { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { username: true },
    });
    // همان نامی که صفحه‌ی سالن نمایش می‌دهد (username)
    const name = user?.username?.trim();
    if (!name) {
      return NextResponse.json(
        { error: 'ابتدا نام کاربری خود را در پروفایل تکمیل کنید' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'اطلاعات ارسالی نامعتبر است' }, { status: 400 });
    }

    // امتیاز: فقط عدد صحیح ۰ تا ۵ (قبلاً هر عددی، حتی ۹۹۹۹۹۹، میانگین را خراب می‌کرد)
    const rating = Number(body.rating ?? 0);
    if (!Number.isInteger(rating) || rating < 0 || rating > 5) {
      return NextResponse.json({ error: 'امتیاز باید عددی بین ۰ تا ۵ باشد' }, { status: 400 });
    }

    const comment =
      typeof body.comment === 'string' ? body.comment.trim().slice(0, MAX_COMMENT) : '';

    if (rating === 0 && !comment) {
      return NextResponse.json(
        { error: 'حداقل یکی از موارد (امتیاز یا متن نظر) الزامی است' },
        { status: 400 }
      );
    }

    const { id: salonId } = await params;

    const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { id: true } });
    if (!salon) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    let resultReview;

    if (rating > 0) {
      // امتیاز ستاره‌ای: هر کاربر یک رکورد امتیاز دارد و می‌تواند آن را تغییر دهد
      const existingRating = await prisma.review.findFirst({
        where: { salonId, name, rating: { gt: 0 } },
        select: { id: true },
      });

      if (existingRating) {
        resultReview = await prisma.review.update({
          where: { id: existingRating.id },
          data: { rating },
        });
      } else {
        resultReview = await prisma.review.create({
          data: { name, rating, comment, salonId },
        });
      }
    } else {
      // نظر متنی: همیشه یک رکورد جدید
      resultReview = await prisma.review.create({
        data: { name: name.slice(0, MAX_NAME), rating: 0, comment, salonId },
      });
    }

    // میانگین و تعداد با «یک» کوئری aggregate در دیتابیس (قبلاً همه‌ی نظرات به حافظه‌ی
    // سرور کشیده و با reduce جمع زده می‌شد)
    const agg = await prisma.review.aggregate({
      where: { salonId, rating: { gt: 0 } },
      _avg: { rating: true },
      _count: { _all: true },
    });

    await prisma.salon.update({
      where: { id: salonId },
      data: { rating: agg._avg.rating ?? 0, reviewsCount: agg._count._all },
    });

    return NextResponse.json(resultReview, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'خطا در ثبت اطلاعات در دیتابیس' }, { status: 500 });
  }
}
