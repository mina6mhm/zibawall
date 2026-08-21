// lib/requireAdmin.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// بررسی می‌کند که درخواست‌کننده لاگین است و نقش ADMIN دارد.
// در صورت موفقیت، شیء کاربر ادمین برمی‌گردد؛ در غیر این صورت یک آبجکت خطا
// با status مناسب (۴۰۱ برای عدم احراز هویت، ۴۰۳ برای عدم دسترسی) برمی‌گردد.
export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return { error: 'ابتدا وارد حساب کاربری شوید', status: 401 as const };
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET!);
  } catch {
    return { error: 'توکن نامعتبر است', status: 401 as const };
  }

  const adminUser = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, role: true, name: true },
  });

  if (adminUser?.role !== 'ADMIN') {
    return { error: 'شما دسترسی ادمین ندارید', status: 403 as const };
  }

  return { user: adminUser };
}