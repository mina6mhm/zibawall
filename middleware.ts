import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // صفحه‌ی جزئیات یک سالن (/salon/xxxx) — برای لینک/QR اشتراک‌گذاری باید بدون لاگین هم قابل مشاهده باشه
  // توجه: زیرمسیرهای آن مثل /salon/xxxx/book (نوبت‌دهی) عمومی نیستند و همچنان لاگین لازم دارند
  const isPublicSalonDetailPath = /^\/salon\/[^\/]+\/?$/.test(path);

  // مسیرهای عمومی: لندینگ، صفحه‌ی ورود، بلاگ و صفحه‌ی جزئیات سالن
  const isPublicPath =
    path === '/' ||
    path === '/login' ||
    path === '/blog' ||
    path.startsWith('/blog/') ||
    isPublicSalonDetailPath;

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
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)',
  ],
};