// app/api/user/profile/route.ts

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { getAccessibleSalonsForUserId, ACTIVE_SALON_COOKIE } from '@/lib/salonAccess';

// دریافت اطلاعات کاربر در صفحه پروفایل
export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'عدم دسترسی' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    // همه‌ی سالن‌هایی که این کاربر بهشون دسترسی داره: هم سالن خودش (اگه مالک باشه)
    // هم سالن‌هایی که به‌عنوان «مدیر» با همین شماره موبایل بهش اضافه شده
    const accessibleSalons = await getAccessibleSalonsForUserId(user.id);

    let activeSalonId: string | null = null;
    try {
      const cookieStore = await cookies();
      activeSalonId = cookieStore.get(ACTIVE_SALON_COOKIE)?.value || null;
    } catch {
      // نادیده گرفته می‌شود
    }

    const active =
      (activeSalonId && accessibleSalons.find((a) => a.salon.id === activeSalonId)) ||
      accessibleSalons.find((a) => a.isOwner) ||
      accessibleSalons[0] ||
      null;

    return NextResponse.json({
      id: user.id,
      name: user.name,
      phone: user.phone,
      username: user.username,
      role: user.role,     // 👈 این خط اضافه شد
      salon: active?.salon ?? null,
      isSalonOwner: active?.isOwner ?? false, // فقط صاحب اصلی؛ مدیرها false می‌گیرن
      // لیست همه‌ی سالن‌های در دسترس، برای سوییچر — همیشه برگردونده می‌شه حتی اگه فقط یک سالن باشه
      salons: accessibleSalons.map((a) => ({
        id: a.salon.id,
        name: a.salon.name,
        city: a.salon.city,
        province: a.salon.province,
        imageUrl: a.salon.imageUrl,
        isOwner: a.isOwner,
        isActive: active?.salon.id === a.salon.id,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: 'توکن نامعتبر یا خطای سرور' }, { status: 401 });
  }
}

// ویرایش اطلاعات در صفحه پروفایل
export async function PUT(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'عدم دسترسی' }, { status: 401 });
    }

    const decoded: any = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');

    const body = await req.json();
    const { name, username } = body;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (username !== undefined) updateData.username = username.trim();

    const updatedUser = await prisma.user.update({
      where: { id: decoded.userId },
      data: updateData,
      include: { salon: true }
    });

    return NextResponse.json({ 
      message: 'پروفایل آپدیت شد', 
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        username: updatedUser.username,
        role: updatedUser.role,   // 👈 این خط هم اضافه شد (برای یکدستی)
        salon: updatedUser.salon
      } 
    });
    
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('username')) {
      return NextResponse.json(
        { error: 'این نام کاربری قبلاً توسط شخص دیگری ثبت شده است. لطفاً نام دیگری انتخاب کنید.' }, 
        { status: 400 }
      );
    }
    
    return NextResponse.json({ error: 'خطا در ذخیره اطلاعات' }, { status: 500 });
  }
}