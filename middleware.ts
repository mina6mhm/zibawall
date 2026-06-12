import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // گرفتن توکن یا وضعیت لاگین از کوکی‌ها
  // نکته: نام 'token' را به نامی که در پروژه برای ذخیره لاگین استفاده می‌کنید تغییر دهید
  const token = request.cookies.get('token')?.value

  // بررسی اینکه آیا کاربر الان در مسیر لاگین قرار دارد یا خیر
  const isLoginPage = request.nextUrl.pathname.startsWith('/login')

  // اگر توکن نداشت (لاگین نبود) و در صفحه لاگین هم نبود -> هدایت به لاگین
  if (!token && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // اگر توکن داشت (لاگین بود) و خواست دوباره وارد صفحه لاگین شود -> هدایت به داشبورد
  if (token && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // اجازه عبور به مسیر درخواستی
  return NextResponse.next()
}

// این بخش مشخص می‌کند میدلور روی چه مسیرهایی اجرا شود
export const config = {
  matcher: [
    /*
     * اعمال روی تمام مسیرها به جز:
     * - مسیرهای api
     * - فایل‌های استاتیک سیستم (_next/static و _next/image)
     * - تصاویر و فایل‌های عمومی (مثل favicon.ico, logo.png و ...)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png|.*\\.jpg|.*\\.jpeg).*)',
  ],
}
