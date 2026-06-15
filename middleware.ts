import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // ۱. مسیرهایی که برای همه آزاد هستند (مثل صفحه لاگین)
  const isPublicPath = path === '/login';

  // ۲. دریافت توکن از کوکی‌ها
  const token = request.cookies.get('token')?.value || '';

  // ۳. اگر کاربر توکن ندارد و می‌خواهد به صفحات محافظت‌شده (مثل داشبورد '/') برود
  // او را به صفحه ورود هدایت می‌کنیم
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // ۴. اگر کاربر توکن (لاگین) دارد و می‌خواهد وارد صفحه '/login' شود
  // او را به صفحه اصلی (داشبورد) برمی‌گردانیم
  if (isPublicPath && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // در غیر این صورت اجازه عبور می‌دهیم
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * اعمال میدلور روی تمام مسیرها به جز:
     * 1. مسیرهای API
     * 2. فایل‌های استاتیک Next.js
     * 3. فایل مانیفست PWA (بسیار مهم)
     * 4. تمامی عکس‌ها با فرمت‌های مختلف
     */
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|svg|ico)$).*)',
  ],
};
