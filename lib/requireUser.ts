// lib/requireUser.ts
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';

// بررسی می‌کند که درخواست‌کننده لاگین است — برخلاف requireAdmin، نقش خاصی
// نمی‌خواهد؛ برای مسیرهایی مثل ثبت/حذف subscription نوتیف که هر کاربر
// (نه فقط ادمین) باید بتونه استفاده کنه.
export async function requireUser() {
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

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id: true, role: true, name: true },
  });

  if (!user) {
    return { error: 'کاربر یافت نشد', status: 401 as const };
  }

  return { user };
}