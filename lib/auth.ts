// lib/auth.ts
// یک نقطه‌ی مشترک برای خواندن و اعتبارسنجی کوکی توکن (قبلاً در ۷+ فایل کپی شده بود)
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

export type AuthResult =
  | { userId: string; role?: string }
  | { error: string; status: 401 | 500 };

export async function getAuthUser(): Promise<AuthResult> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not defined');
    return { error: 'خطای پیکربندی سرور', status: 500 };
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return { error: 'ابتدا وارد حساب کاربری شوید', status: 401 };

  try {
    // algorithms صریح: جلوی حمله‌ی alg-confusion را می‌گیرد
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });

    // اگر userId نبود، Prisma شرط where را نادیده می‌گرفت (undefined = بدون فیلتر)
    // و ممکن بود داده‌ی همه‌ی کاربران برگردد
    if (
      typeof decoded === 'string' ||
      !(typeof decoded.userId === 'string' || typeof decoded.userId === 'number') ||
      decoded.userId === ''
    ) {
      return { error: 'توکن نامعتبر است', status: 401 };
    }

    return { userId: decoded.userId as string, role: decoded.role as string | undefined };
  } catch {
    return { error: 'توکن نامعتبر یا منقضی شده است', status: 401 };
  }
}

// برای فایل‌هایی که خودشان کوکی را می‌خوانند: اعتبارسنجی یکسان توکن (HS256 + userId معتبر)
// بدون هیچ secret پیش‌فرض. اگر نامعتبر بود null برمی‌گرداند.
export function verifyAuthToken(token: string): { userId: string; role?: string } | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET is not defined');
    return null;
  }
  try {
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    if (typeof decoded === 'string') return null;
    if (typeof decoded.userId !== 'string' || decoded.userId === '') return null;
    return { userId: decoded.userId, role: decoded.role as string | undefined };
  } catch {
    return null;
  }
}
