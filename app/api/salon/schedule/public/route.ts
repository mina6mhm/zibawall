// app/api/salon/schedule/public/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const WEEK_DAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

// تبدیل ارقام فارسی/عربی به انگلیسی در کل متن
const toEnglishDigitsInText = (str: string) =>
  str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - '۰'.charCodeAt(0)))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - '٠'.charCodeAt(0)));

// تلاش برای استخراج ساعت شروع/پایان از متن آزاد ثبت‌نام، مثل «۱۰ صبح تا ۸ شب»
function parseWorkingHoursToTimes(raw: string | null | undefined): { start: string; end: string } | null {
  if (!raw) return null;
  const text = toEnglishDigitsInText(raw);
  const matches = [...text.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(صبح|ظهر|بعد\s?از\s?ظهر|عصر|شب)?/g)].filter(
    (m) => m[1] !== undefined
  );
  if (matches.length < 2) return null;

  const toParts = (m: RegExpMatchArray) => {
    let h = parseInt(m[1], 10);
    const minute = m[2] ? parseInt(m[2], 10) : 0;
    const period = m[3] || '';
    const isPm = period.includes('عصر') || period.includes('شب') || period.includes('بعد');
    const isNoon = period === 'ظهر';
    if ((isPm || isNoon) && h < 12) h += 12;
    if (h > 23) h = 23;
    return { h, minute };
  };

  const startInfo = toParts(matches[0]);
  const endInfo = toParts(matches[matches.length - 1]);
  const fmt = (h: number, m: number) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  return { start: fmt(startInfo.h, startInfo.minute), end: fmt(endInfo.h, endInfo.minute) };
}

// نسخه‌ی عمومی و بدون نیاز به لاگین — برنامه‌ی هفتگی *واقعی و به‌روز* سالن را برمی‌گرداند
// (همان منطق fallback که در available-slots استفاده می‌شود)، تا تقویم صفحه‌ی رزرو مشتری
// همیشه با آخرین تنظیمات سالن‌دار هماهنگ باشد، نه فقط closedDays ثبت‌نام اولیه.
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const salonId = searchParams.get('salonId');

    if (!salonId) {
      return NextResponse.json({ error: 'salonId الزامی است' }, { status: 400 });
    }

    const [salon, salonScheduleRow] = await Promise.all([
      prisma.salon.findUnique({ where: { id: salonId } }),
      prisma.salonSchedule.findUnique({ where: { salonId } }),
    ]);

    if (!salon) {
      return NextResponse.json({ error: 'سالنی یافت نشد' }, { status: 404 });
    }

    let weeklySchedule: Record<string, { open: boolean; start: string; end: string }>;

    if (salonScheduleRow?.weeklySchedule && Object.keys(salonScheduleRow.weeklySchedule as any).length > 0) {
      weeklySchedule = salonScheduleRow.weeklySchedule as any;
    } else {
      const closedDays = salon.closedDays ?? [];
      const parsedHours = parseWorkingHoursToTimes(salon.workingHours);
      weeklySchedule = Object.fromEntries(
        WEEK_DAYS.map((d) => [
          d,
          {
            open: !closedDays.includes(d),
            start: parsedHours?.start ?? '09:00',
            end: parsedHours?.end ?? '20:00',
          },
        ])
      );
    }

    const closedDays = WEEK_DAYS.filter((d) => weeklySchedule[d]?.open === false);

    return NextResponse.json({ closedDays });
  } catch (error) {
    console.error('Error fetching public salon schedule:', error);
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 });
  }
}