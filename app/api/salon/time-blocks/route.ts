// app/api/salon/time-blocks/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import jwt from 'jsonwebtoken';

import { prisma } from '@/lib/prisma';
import { findBookingConflict, getTotalDuration, getStaffNames, timeToMinutes } from '@/lib/booking-availability';

export const dynamic = 'force-dynamic';

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

function parseDateParam(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return null;
  return d;
}

// دریافت مسدودی‌های یک روز خاص
export async function GET(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { searchParams } = new URL(req.url);
    const date = parseDateParam(searchParams.get('date'));
    if (!date) {
      return NextResponse.json({ error: 'تاریخ نامعتبر است' }, { status: 400 });
    }

    const blocks = await prisma.timeBlock.findMany({
      where: { salonId: result.salon.id, date },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json({ blocks }, { status: 200 });
  } catch (error) {
    console.error('Error fetching time blocks:', error);
    return NextResponse.json({ error: 'خطای سرور در دریافت مسدودی‌ها' }, { status: 500 });
  }
}

// ساخت یک بازه‌ی مسدود جدید (مثلاً وقتی سالن‌دار می‌خواهد چند ساعت را خالی نگه دارد)
export async function POST(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    const { salon } = result;

    const body = await req.json();
    const { date, startTime, endTime, staffName, reason } = body;

    const parsedDate = parseDateParam(date);
    if (!parsedDate) {
      return NextResponse.json({ error: 'تاریخ نامعتبر است' }, { status: 400 });
    }

    if (!startTime || !endTime || startTime >= endTime) {
      return NextResponse.json({ error: 'بازه‌ی زمانی نامعتبر است' }, { status: 400 });
    }

    // نمی‌توان بازه‌ای را مسدود کرد که یک نوبت فعال (غیرلغوشده) داخلش هست
    const dayBookings = await prisma.booking.findMany({
      where: { salonId: salon.id, date: parsedDate, status: { not: 'CANCELLED' } },
    });

    const existingBookings = dayBookings.map((b) => ({
      id: b.id,
      startTime: b.startTime,
      durationMinutes: getTotalDuration(b.services as any),
      staffNames: getStaffNames(b.services as any),
    }));

    const conflict = findBookingConflict({
      startTime,
      durationMinutes: timeToMinutes(endTime) - timeToMinutes(startTime),
      staffNames: staffName ? [staffName] : [],
      existingBookings,
      timeBlocks: [],
    });

    if (conflict) {
      return NextResponse.json(
        { error: 'در این بازه یک نوبت فعال ثبت شده؛ ابتدا آن نوبت را جابجا یا لغو کنید' },
        { status: 409 }
      );
    }

    const block = await prisma.timeBlock.create({
      data: {
        salonId: salon.id,
        date: parsedDate,
        startTime,
        endTime,
        staffName: typeof staffName === 'string' && staffName.trim() ? staffName.trim() : null,
        reason: typeof reason === 'string' && reason.trim() ? reason.trim() : null,
      },
    });

    return NextResponse.json({ success: true, block }, { status: 201 });
  } catch (error) {
    console.error('Error creating time block:', error);
    return NextResponse.json({ error: 'خطای سرور در ثبت مسدودی' }, { status: 500 });
  }
}

// حذف (لغو) یک مسدودی
export async function DELETE(req: Request) {
  try {
    const result = await getOwnedSalonFromToken();
    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'آیدی مسدودی ارسال نشده است' }, { status: 400 });
    }

    const block = await prisma.timeBlock.findUnique({ where: { id } });
    if (!block || block.salonId !== result.salon.id) {
      return NextResponse.json({ error: 'مسدودی یافت نشد' }, { status: 404 });
    }

    await prisma.timeBlock.delete({ where: { id } });
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting time block:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف مسدودی' }, { status: 500 });
  }
}