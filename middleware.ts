import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // اجازه عبور به تمام درخواست‌ها بدون ریدایرکت به لاگین
  return NextResponse.next();
}

// در صورت نیاز به اعمال روی مسیرهای خاص (اختیاری)
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
