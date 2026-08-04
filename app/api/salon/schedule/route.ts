// app/api/salon/schedule/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';
import { WEEK_DAYS } from '@/components/business-form/constants';

export const dynamic = 'force-dynamic';

const DEFAULT_OPEN = '10:00';
const DEFAULT_CLOSE = '20:00';

async function getOwnedSalonFromToken() {
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

  return { salon };
}

// دریافت ساعات کاری هفتگی سالن؛ اگر برای روزی رکوردی در دیتابیس نباشد،
// یک مقدار پیش‌فرض ساخته می‌شود (بر اساس closedDays قدیمی سالن، برای سازگاری)
export async function GET() {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const existingRows = await prisma.salonSchedule.findMany({
      where: { salonId: result.salon.id },
      orderBy: { dayOfWeek: 'asc' },
    });

    const byDay = new Map(existingRows.map((row) => [row.dayOfWeek, row]));
    const closedDaySet = new Set(result.salon.closedDays || []);

    const days = WEEK_DAYS.map((label: string, index: number) => {
      const row = byDay.get(index);
      if (row) {
        return {
          dayOfWeek: index,
          label,
          isOpen: row.isOpen,
          openTime: row.openTime,
          closeTime: row.closeTime,
        };
      }
      return {
        dayOfWeek: index,
        label,
        isOpen: !closedDaySet.has(label),
        openTime: DEFAULT_OPEN,
        closeTime: DEFAULT_CLOSE,
      };
    });

    return NextResponse.json({ days }, { status: 200 });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت ساعات کاری' }, { status: 500 });
  }
}

// ذخیره‌ی ساعات کاری هفتگی (هر ۷ روز یک‌جا ارسال و ذخیره می‌شود)
export async function PUT(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { salon } = result;

    const body = await req.json();
    const days = body?.days;

    if (!Array.isArray(days) || days.length !== 7) {
      return NextResponse.json({ error: 'اطلاعات ساعات کاری ناقص است' }, { status: 400 });
    }

    for (const d of days) {
      if (
        typeof d.dayOfWeek !== 'number' ||
        typeof d.isOpen !== 'boolean' ||
        typeof d.openTime !== 'string' ||
        typeof d.closeTime !== 'string'
      ) {
        return NextResponse.json({ error: 'فرمت داده‌ها نامعتبر است' }, { status: 400 });
      }
      if (d.isOpen && d.openTime >= d.closeTime) {
        return NextResponse.json(
          { error: `ساعت شروع باید قبل از ساعت پایان باشد (${WEEK_DAYS[d.dayOfWeek] ?? ''})` },
          { status: 400 }
        );
      }
    }

    await prisma.$transaction(
      days.map((d: any) =>
        prisma.salonSchedule.upsert({
          where: { salonId_dayOfWeek: { salonId: salon.id, dayOfWeek: d.dayOfWeek } },
          create: {
            salonId: salon.id,
            dayOfWeek: d.dayOfWeek,
            isOpen: d.isOpen,
            openTime: d.openTime,
            closeTime: d.closeTime,
          },
          update: {
            isOpen: d.isOpen,
            openTime: d.openTime,
            closeTime: d.closeTime,
          },
        })
      )
    );

    // هماهنگ‌سازی فیلد قدیمی closedDays سالن، چون در فیلتر داشبورد و جاهای دیگر استفاده شده
    const newClosedDays = days.filter((d: any) => !d.isOpen).map((d: any) => WEEK_DAYS[d.dayOfWeek]);
    await prisma.salon.update({
      where: { id: salon.id },
      data: { closedDays: newClosedDays },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'خطای سرور در ذخیره ساعات کاری' }, { status: 500 });
  }
}