// lib/push.ts   (فایل قبلی push.tsx بود — پسوند را .ts کن و فایل قدیمی را پاک کن)
// ارسال نوتیف Web Push از خود اپ (ادمین‌ها و کاربران).
//
// ⚠️ کلیدهای VAPID دیگر داخل کد/کامنت نیستند. فقط در .env:
//    NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
//    VAPID_PRIVATE_KEY=...
//    VAPID_SUBJECT=mailto:you@example.com
// کلید خصوصی قبلی داخل کامنت همین فایل بود؛ اگر این کد جایی commit یا share شده،
// یک جفت کلید جدید بساز (npx web-push generate-vapid-keys) و جایگزین کن
// (بعد از تعویض، subscriptionهای قبلی باید دوباره ثبت شوند).

import webpush from 'web-push';
import type { PushSubscription as DbPushSubscription } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { mapLimit } from '@/lib/concurrency';

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@example.com';

  if (!publicKey || !privateKey) {
    console.warn('⚠️ VAPID_PRIVATE_KEY یا NEXT_PUBLIC_VAPID_PUBLIC_KEY تنظیم نشده — نوتیف Web Push ارسال نشد');
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

type PushPayload = {
  title: string;
  body: string;
  url?: string;
};

// timeout: بدون آن یک سرور push کند، اتصال را تا ابد باز نگه می‌دارد
// TTL: اگر دستگاه آفلاین بود، پیام بعد از ۶ ساعت دور ریخته شود (یادآوری کهنه بی‌فایده است)
const SEND_OPTIONS = { timeout: 10_000, TTL: 6 * 60 * 60 } as const;
const SEND_CONCURRENCY = 20;

// منطق مشترک ارسال (قبلاً دو بار کپی شده بود). عمداً throw نمی‌کند.
async function deliver(subscriptions: DbPushSubscription[], payload: PushPayload, defaultUrl: string) {
  if (subscriptions.length === 0) return;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || defaultUrl,
  });

  const deadIds: string[] = [];

  await mapLimit(subscriptions, SEND_CONCURRENCY, async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        notificationPayload,
        SEND_OPTIONS
      );
    } catch (err: any) {
      // ۴۰۴/۴۱۰ یعنی subscription منقضی یا لغو شده
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        deadIds.push(sub.id);
      } else {
        console.error(`❌ Web push error for subscription ${sub.id}:`, err?.statusCode, err?.body || err?.message);
      }
    }
  });

  // یک query برای همه‌ی منقضی‌ها
  if (deadIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: deadIds } } }).catch(() => {});
  }
}

export async function sendWebPushToAdmins(payload: PushPayload) {
  if (!ensureVapidConfigured()) return;
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: 'ADMIN' } },
  });
  await deliver(subscriptions, payload, '/admin/salons');
}

export async function notifyAdminNewSalonPendingPush(salon: {
  name: string;
  province: string;
  city: string;
  isResubmission?: boolean;
}) {
  const title = salon.isResubmission
    ? '♻️ سالن رد‌شده دوباره ارسال شد'
    : '🆕 سالن جدید در انتظار تایید';
  const body = `${salon.name} — ${salon.province}، ${salon.city}`;

  await sendWebPushToAdmins({ title, body, url: '/admin/salons' });
}

export async function sendWebPushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapidConfigured()) return;
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  await deliver(subscriptions, payload, '/appointments');
}

export async function notifyUserBookingReminderPush(
  userId: string,
  booking: { salonName: string; date: string; time: string }
) {
  await sendWebPushToUser(userId, {
    title: '⏰ یادآوری نوبت',
    body: `فردا ساعت ${booking.time} نوبت ${booking.salonName} داری — ${booking.date}`,
    url: '/appointments',
  });
}