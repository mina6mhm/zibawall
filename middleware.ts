import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // مسیرهای عمومی: لندینگ و صفحه‌ی ورود
  const isPublicPath = path === '/' || path === '/login';

  const token = request.cookies.get('token')?.value || '';

  // اگر مسیر محافظت‌شده است (مثل /dashboard) و کاربر توکن ندارد → برو به لاگین
  if (!isPublicPath && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
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