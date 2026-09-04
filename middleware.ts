import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // صفحه‌ی جزئیات یک سالن (/salon/xxxx) — برای لینک/QR اشتراک‌گذاری باید بدون لاگین هم قابل مشاهده باشه
  // توجه: زیرمسیرهای آن مثل /salon/xxxx/book (نوبت‌دهی) عمومی نیستند و همچنان لاگین لازم دارند
  const isPublicSalonDetailPath = /^\/salon\/[^\/]+\/?$/.test(path);

  // مسیرهای عمومی: لندینگ، صفحه‌ی ورود، بلاگ و صفحه‌ی جزئیات سالن
  //
  // صفحه‌ی نتیجه‌ی پرداخت (/payment/result) — مقصدِ برگشت از درگاه است. روی
  // اپ‌های نیتیو (اندروید/iOS) پرداخت داخل مرورگر سیستم باز می‌شود که کوکی
  // لاگینِ خودِ اپ را ندارد، پس این صفحه باید بدون لاگین هم قابل مشاهده باشد
  // — وگرنه کاربر همین‌جا به /login پرت می‌شود و باید دوباره شماره/کد تایید
  // بزند، با این‌که سشنِ خودِ اپ اصلاً از بین نرفته. (برای جزئیات به
  // app/payment/result/page.tsx و lib/openPaymentUrl.ts نگاه کنید)
  const isPaymentResultPath = path === '/payment/result';

  const isPublicPath =
    path === '/' ||
    path === '/login' ||
    path === '/blog' ||
    path.startsWith('/blog/') ||
    isPublicSalonDetailPath ||
    isPaymentResultPath;

  const token = request.cookies.get('token')?.value || '';

  // اگر مسیر محافظت‌شده است (مثل /dashboard) و کاربر توکن ندارد → برو به لاگین
  // (next رو نگه می‌داریم تا بعد از لاگین کاربر به همون صفحه برگرده)
  if (!isPublicPath && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  // اگر کاربر لاگین است و می‌خواهد صفحه‌ی /login را ببیند → برو به پیشخوان
  if (path === '/login' && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|\\.well-known|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)',
  ],
};