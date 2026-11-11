// app/api/salon/schedule/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSalonFromCookieToken as getSalonFromToken } from '@/lib/salonAccess';
import { WEEK_DAYS } from '@/lib/bookingSchedule';
import { rateLimit } from '@/lib/rateLimit';
import { isHHMM, parseJsonBody, tooManyRequests } from '@/lib/http';

type DaySchedule = { open: boolean; start: string; end: string };

// ساختار برنامه‌ی هفتگی را تمیز می‌کند: فقط ۷ روز شناخته‌شده، با {open,start,end}.
// قبلاً هر JSON دلخواه (حتی چند مگابایت) مستقیم در دیتابیس ذخیره می‌شد.
function sanitizeWeeklySchedule(raw: unknown): Record<string, DaySchedule> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const out: Record<string, DaySchedule> = {};
  for (const day of WEEK_DAYS) {
    const d = (raw as Record<string, unknown>)[day];
    if (d === undefined) continue;
    if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
    const { open, start, end } = d as Record<string, unknown>;
    out[day] = {
      open: Boolean(open),
      start: isHHMM(start) ? start : '09:00',
      end: isHHMM(end) ? end : '20:00',
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

// GET: دریافت برنامه هفتگی سالن
export async function GET() {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const schedule = await prisma.salonSchedule.findUnique({
    where: { salonId: salon.id },
  });

  if (!schedule) return NextResponse.json({ weeklySchedule: null, gridMinutes: 30 });

  return NextResponse.json({
    weeklySchedule: schedule.weeklySchedule,
    gridMinutes: schedule.gridMinutes,
  });
}

// POST: ذخیره یا بروزرسانی برنامه هفتگی
export async function POST(req: Request) {
  const salon = await getSalonFromToken();
  if (!salon) return NextResponse.json({ error: 'دسترسی ندارید' }, { status: 401 });

  const limit = await rateLimit(`salon-schedule:${salon.id}`, 30, 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const parsed = await parseJsonBody(req);
  if (!parsed.ok) return parsed.response;
  const { weeklySchedule: rawSchedule, gridMinutes } = parsed.body;

  if (!rawSchedule) return NextResponse.json({ error: 'weeklySchedule الزامی است' }, { status: 400 });
  if (![15, 30, 60].includes(Number(gridMinutes)))
    return NextResponse.json({ error: 'gridMinutes باید ۱۵، ۳۰ یا ۶۰ باشد' }, { status: 400 });

  const weeklySchedule = sanitizeWeeklySchedule(rawSchedule);
  if (!weeklySchedule) {
    return NextResponse.json({ error: 'weeklySchedule نامعتبر است' }, { status: 400 });
  }

  const schedule = await prisma.salonSchedule.upsert({
    where: { salonId: salon.id },
    create: {
      salonId: salon.id,
      weeklySchedule,
      gridMinutes: Number(gridMinutes),
    },
    update: {
      weeklySchedule,
      gridMinutes: Number(gridMinutes),
    },
  });

  return NextResponse.json({ success: true, schedule });
}
