// app/api/user/profile/route.ts

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getAuthUser } from '@/lib/auth';
import { getAccessibleSalonsForUserId, ACTIVE_SALON_COOKIE } from '@/lib/salonAccess';

export const dynamic = 'force-dynamic';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;
const MAX_NAME_LENGTH = 60;

// دریافت اطلاعات کاربر در صفحه پروفایل
export async function GET() {
  try {
    // قبلاً اگر JWT_SECRET تنظیم نبود از یک کلید پیش‌فرضِ عمومی استفاده می‌شد و هرکسی
    // می‌توانست توکن جعلی بسازد؛ حالا همان اعتبارسنجی مشترک (بدون کلید پیش‌فرض) استفاده می‌شود.
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // فقط ستون‌های لازم (نه otpCode/passwordHash و ...)
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { id: true, name: true, phone: true, username: true, role: true },
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
      role: user.role,
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
    // قبلاً هر خطای دیتابیس هم ۴۰۱ برمی‌گرداند و کاربر لاگین‌شده را به صفحه‌ی ورود می‌فرستاد
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}

// ویرایش اطلاعات در صفحه پروفایل
export async function PUT(req: Request) {
  try {
    const auth = await getAuthUser();
    if ('error' in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'اطلاعات ارسالی نامعتبر است' }, { status: 400 });
    }

    const updateData: { name?: string; username?: string } = {};

    // اگر name/username رشته نبود، .trim() می‌ترکید و ۵۰۰ می‌داد
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length > MAX_NAME_LENGTH) {
        return NextResponse.json({ error: 'نام وارد شده نامعتبر یا بیش از حد طولانی است' }, { status: 400 });
      }
      updateData.name = body.name.trim();
    }

    // صفحه‌ی پروفایل برای کاربرِ بدون نام کاربری username خالی می‌فرستد؛ خالی = «بدون تغییر».
    // (قبلاً '' ذخیره می‌شد و چون username یکتاست، کاربر دوم با '' خطای ۴۰۰ می‌گرفت)
    if (body.username !== undefined) {
      if (typeof body.username !== 'string') {
        return NextResponse.json({ error: 'نام کاربری نامعتبر است' }, { status: 400 });
      }
      const username = body.username.trim();
      if (username !== '') {
        if (!USERNAME_REGEX.test(username)) {
          return NextResponse.json(
            { error: 'نام کاربری باید بین ۳ تا ۲۰ کاراکتر و فقط شامل حروف انگلیسی، اعداد و _ باشد' },
            { status: 400 }
          );
        }
        updateData.username = username;
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'هیچ فیلدی برای بروزرسانی ارسال نشده است' }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: updateData,
      include: { salon: true },
    });

    return NextResponse.json({
      message: 'پروفایل آپدیت شد',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        phone: updatedUser.phone,
        username: updatedUser.username,
        role: updatedUser.role,
        salon: updatedUser.salon,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: 'این نام کاربری قبلاً توسط شخص دیگری ثبت شده است. لطفاً نام دیگری انتخاب کنید.' },
          { status: 400 }
        );
      }
      if (error.code === 'P2025') {
        return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
      }
    }

    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'خطا در ذخیره اطلاعات' }, { status: 500 });
  }
}
