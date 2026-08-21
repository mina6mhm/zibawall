// lib/salonAccess.ts
//
// یک شماره موبایل ممکن است «مدیر» یک سالن باشد بدون اینکه صاحب اصلی
// (userId ثبت‌شده روی رکورد Salon) آن باشد. این فایل جایگزین همه‌ی
// جاهایی می‌شود که قبلاً مستقیماً با
//   prisma.salon.findUnique({ where: { userId } })
// سالن کاربر لاگین‌شده را پیدا می‌کردند؛ حالا هم صاحب اصلی و هم
// مدیرهای اضافه‌شده (SalonManager) را در نظر می‌گیرد.

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import type { Salon } from '@prisma/client';

export type SalonAccess = {
  salon: Salon;
  isOwner: boolean;
};

// سالن + مشخص می‌کند که کاربر صاحب اصلی است یا فقط مدیر اضافه‌شده
export async function getSalonAccessForUserId(userId: string): Promise<SalonAccess | null> {
  const ownedSalon = await prisma.salon.findUnique({ where: { userId } });
  if (ownedSalon) return { salon: ownedSalon, isOwner: true };

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.phone) return null;

  const managerRecord = await prisma.salonManager.findFirst({
    where: { phone: user.phone },
    include: { salon: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!managerRecord) return null;

  return { salon: managerRecord.salon, isOwner: false };
}

// فقط خود سالن — جایگزین مستقیم الگوی قدیمیِ
// prisma.salon.findUnique({ where: { userId: decoded.userId } })
export async function getSalonForUserId(userId: string): Promise<Salon | null> {
  const access = await getSalonAccessForUserId(userId);
  return access?.salon ?? null;
}

// همان کار بالا، اما مستقیم از روی کوکی توکن — برای روت‌هایی که فقط سالن را لازم دارند
export async function getSalonFromCookieToken(): Promise<Salon | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) return null;
  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);
    return await getSalonForUserId(decoded.userId);
  } catch {
    return null;
  }
}