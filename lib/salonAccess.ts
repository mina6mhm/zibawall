// lib/salonAccess.ts
//
// یک کاربر ممکن است به چند سالن دسترسی داشته باشد:
//   ۱) سالنی که خودش با همین حساب ثبت کرده (مالک اصلی — userId روی رکورد Salon)
//   ۲) سالن‌هایی که صاحب‌شان او را با شماره موبایلش به‌عنوان «مدیر» اضافه کرده (SalonManager)
//
// کاربر با کوکی «activeSalonId» مشخص می‌کند الان روی کدام‌یک از سالن‌های
// در دسترسش کار می‌کند (سوییچر سالن). این فایل جایگزین همه‌ی جاهایی شده که
// قبلاً مستقیماً با prisma.salon.findUnique({ where: { userId } }) سالنِ
// کاربر لاگین‌شده را پیدا می‌کردند.

import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import type { Salon } from '@prisma/client';

export const ACTIVE_SALON_COOKIE = 'activeSalonId';

export type SalonAccess = {
  salon: Salon;
  isOwner: boolean;
};

// همه‌ی سالن‌هایی که این کاربر بهشون دسترسی داره (مالکیت یا مدیریت)
export async function getAccessibleSalonsForUserId(userId: string): Promise<SalonAccess[]> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return [];

  const results: SalonAccess[] = [];

  const ownedSalon = await prisma.salon.findUnique({ where: { userId } });
  if (ownedSalon) results.push({ salon: ownedSalon, isOwner: true });

  if (user.phone) {
    const managerRecords = await prisma.salonManager.findMany({
      where: { phone: user.phone },
      include: { salon: true },
      orderBy: { createdAt: 'asc' },
    });
    for (const rec of managerRecords) {
      if (!results.some((r) => r.salon.id === rec.salon.id)) {
        results.push({ salon: rec.salon, isOwner: false });
      }
    }
  }

  return results;
}

// سالنِ «فعال»ِ کاربر: اگر با سوییچر سالن دیگری را انتخاب کرده باشد همان،
// وگرنه سالن خودش (اگر مالک باشد) و در غیر این صورت اولین سالنی که مدیرش است
export async function getSalonAccessForUserId(userId: string): Promise<SalonAccess | null> {
  const accessible = await getAccessibleSalonsForUserId(userId);
  if (accessible.length === 0) return null;
  if (accessible.length === 1) return accessible[0];

  let preferredId: string | null = null;
  try {
    const cookieStore = await cookies();
    preferredId = cookieStore.get(ACTIVE_SALON_COOKIE)?.value || null;
  } catch {
    // در کانتکست‌هایی که cookies() در دسترس نیست، همون پیش‌فرض استفاده می‌شود
  }

  if (preferredId) {
    const preferred = accessible.find((a) => a.salon.id === preferredId);
    if (preferred) return preferred;
  }

  return accessible.find((a) => a.isOwner) ?? accessible[0];
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
