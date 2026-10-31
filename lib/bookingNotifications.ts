// lib/bookingNotifications.ts
// ارسال پیامک تایید نوبت به مشتری، همان لحظه‌ای که نوبت CONFIRMED می‌شود.
// این تابع هیچ‌وقت خطا throw نمی‌کند؛ مشکل پیامک نباید پرداخت/ثبت نوبت را خراب کند.

import { prisma } from '@/lib/prisma';
import { sendBookingConfirmationSms } from '@/lib/sms';

// booking.date به‌صورت UTC نیمه‌شب ذخیره می‌شود؛ timeZone: 'UTC' جلوی یک‌روز جابه‌جایی را می‌گیرد.
const jalaliDate = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

type Target =
  | { groupId: string; fallbackBaseUrl?: string }
  | { bookingId: string; fallbackBaseUrl?: string };

export async function notifyBookingConfirmed(target: Target): Promise<void> {
  try {
    console.log('📨 notifyBookingConfirmed شروع شد:', JSON.stringify(target));
    const where =
      'groupId' in target
        ? { bookingGroupId: target.groupId, status: 'CONFIRMED' as const }
        : { id: target.bookingId, status: 'CONFIRMED' as const };

    const bookings = await prisma.booking.findMany({
      where,
      include: { salon: { select: { id: true, name: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });
    if (bookings.length === 0) {
      console.warn('📨 پیامک تایید نوبت: هیچ نوبت CONFIRMED پیدا نشد');
      return;
    }

    const first = bookings[0];
    const phone = first.customerPhone;
    if (!phone) {
      console.warn('📨 پیامک تایید نوبت: شماره‌ی مشتری روی نوبت ثبت نشده');
      return;
    }

    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || target.fallbackBaseUrl || '').replace(/\/+$/, '');
    if (!baseUrl) {
      console.error('پیامک تایید نوبت ارسال نشد: NEXT_PUBLIC_BASE_URL تنظیم نشده است');
      return;
    }

    // تاریخ‌ها و ساعت‌ها (اگر سبد چند نوبت داشته باشد، به ترتیب و با «و» کنار هم می‌آیند)
    const dates = Array.from(new Set(bookings.map((b) => jalaliDate.format(new Date(b.date)))));
    const times = bookings.map((b) => b.startTime);

    const serviceNames = Array.from(
      new Set(
        bookings.flatMap((b) =>
          Array.isArray(b.services) ? (b.services as any[]).map((s) => String(s?.name ?? '')).filter(Boolean) : []
        )
      )
    );

    console.log('📨 ارسال پیامک تایید نوبت به', phone);
    await sendBookingConfirmationSms({
      phone,
      salonName: first.salon.name,
      date: dates.join(' و '),
      time: times.join(' و '),
      services: serviceNames.join('، ') || 'خدمات',
      link: `${baseUrl}/salon/${first.salon.id}`,
    });
  } catch (err) {
    console.error('❌ خطا در ارسال پیامک تایید نوبت:', err);
  }
}