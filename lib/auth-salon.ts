// lib/auth-salon.ts
//
// این تابع در حداقل ۵ فایل API جدا-جدا کپی شده بود. از این به بعد
// فقط همین یکی رو ایمپورت کن. (فایل‌های قدیمی رو الان دست نمی‌زنیم که
// چیزی نشکنه، ولی برای فایل‌های جدید همینو استفاده می‌کنیم.)

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

export async function getOwnedSalonFromToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return { error: 'ابتدا وارد حساب کاربری شوید', status: 401 as const };

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return { error: 'توکن نامعتبر است', status: 401 as const };
  }

  const salon = await prisma.salon.findUnique({ where: { userId: decoded.userId } });
  if (!salon) return { error: 'شما سالنی ثبت نکرده‌اید', status: 404 as const };

  return { salon, decoded };
}