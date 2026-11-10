// lib/push.ts
// ارسال نوتیف مستقیم از خود اپ با Web Push، بدون نیاز به تلگرام یا Firebase.
//
// راه‌اندازی:
// ۱. یک جفت کلید VAPID بساز:   npx web-push generate-vapid-keys
// ۲. توی .env (و فقط همان‌جا — هرگز توی کد یا کامنت) بگذار:
//      NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
//      VAPID_PRIVATE_KEY=...
//      VAPID_SUBJECT=mailto:you@example.com
// ۳. با اکانت ادمین وارد پنل مدیریت شو → «فعال‌سازی نوتیف مرورگر».
//
// این فایل مستقل از سیستم تلگرام (lib/telegram.ts) است.

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';
import { runWithConcurrency } from '@/lib/concurrency';

// اگر endpoint پوش (سرورهای گوگل/اپل/موزیلا) کند باشد، نباید کل حلقه گیر کند
const PUSH_TIMEOUT_MS = 10_000;
// حداکثر تعداد ارسال هم‌زمان
const PUSH_CONCURRENCY = 20;
// پیش‌فرض web-push چهار هفته است؛ برای نوتیف‌های این اپ یک روز کافی است
const DEFAULT_TTL_SECONDS = 60 * 60 * 24;

let vapidConfigured = false;

function ensureVapidConfigured(): boolean {
  if (vapidConfigured) return true;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || 'mailto:zibawallapp@gmail.com';

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
  ttlSeconds?: number;
};

type StoredSubscription = { id: string; endpoint: string; p256dh: string; auth: string };

type DeliveryOutcome = 'ok' | 'gone' | 'error';

export type PushResult = 'sent' | 'no_subscription' | 'failed';

const SUBSCRIPTION_SELECT = { id: true, endpoint: true, p256dh: true, auth: true } as const;

function buildBody(payload: PushPayload, defaultUrl: string): string {
  return JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || defaultUrl,
  });
}

// ارسال به یک subscription. هیچ‌وقت throw نمی‌کند.
async function deliverToSubscription(
  sub: StoredSubscription,
  body: string,
  ttlSeconds: number
): Promise<DeliveryOutcome> {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      body,
      { TTL: ttlSeconds, timeout: PUSH_TIMEOUT_MS }
    );
    return 'ok';
  } catch (err: any) {
    // ۴۰۴/۴۱۰ یعنی subscription منقضی یا توسط کاربر لغو شده — از دیتابیس پاکش کن
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      return 'gone';
    }
    console.error(`❌ Web push error for subscription ${sub.id}:`, err?.statusCode, err?.body || err);
    return 'error';
  }
}

// نوتیف Web Push به تمام مرورگرهایی که یک ادمین (role=ADMIN) توشون subscribe کرده.
// عمداً throw نمی‌کنه؛ نبود تنظیمات یا خطای ارسال نباید جریان اصلی رو بشکنه.
export async function sendWebPushToAdmins(payload: PushPayload) {
  if (!ensureVapidConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: 'ADMIN' } },
    select: SUBSCRIPTION_SELECT,
  });
  if (subscriptions.length === 0) return;

  const body = buildBody(payload, '/admin/salons');
  const ttl = payload.ttlSeconds ?? DEFAULT_TTL_SECONDS;

  await runWithConcurrency(subscriptions, PUSH_CONCURRENCY, async (sub) => {
    await deliverToSubscription(sub, body, ttl);
  });
}

// نوتیف اختصاصی: سالن جدید در انتظار تایید ادمین (معادل Web Push همون تابع تلگرام)
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

/**
 * ارسال دسته‌ایِ پوش به چند کاربر (هر آیتم یک پیام مستقل).
 * - subscriptionهای همه‌ی کاربرها با «یک» query گرفته می‌شود (نه یک query برای هر کاربر)
 * - ارسال‌ها با سقف هم‌زمانی انجام می‌شود
 * - خروجی هم‌ترتیب با items است:
 *     'sent'            حداقل یک دستگاه پیام را پذیرفت
 *     'no_subscription' کاربر هیچ subscription فعالی ندارد (تلاش مجدد بی‌فایده است)
 *     'failed'          subscription داشت ولی خطای موقتی بود (تلاش مجدد معنی دارد)
 */
export async function sendWebPushBatch(
  items: { userId: string; payload: PushPayload }[]
): Promise<PushResult[]> {
  if (items.length === 0) return [];
  if (!ensureVapidConfigured()) return items.map(() => 'failed' as const);

  const userIds = Array.from(new Set(items.map((i) => i.userId)));
  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { ...SUBSCRIPTION_SELECT, userId: true },
  });

  const byUser = new Map<string, StoredSubscription[]>();
  for (const s of subscriptions) {
    const list = byUser.get(s.userId) ?? [];
    list.push(s);
    byUser.set(s.userId, list);
  }

  type Job = { itemIndex: number; sub: StoredSubscription; body: string; ttl: number };
  const jobs: Job[] = [];
  items.forEach((item, itemIndex) => {
    const body = buildBody(item.payload, '/appointments');
    const ttl = item.payload.ttlSeconds ?? DEFAULT_TTL_SECONDS;
    for (const sub of byUser.get(item.userId) ?? []) {
      jobs.push({ itemIndex, sub, body, ttl });
    }
  });

  const outcomesByItem = new Map<number, DeliveryOutcome[]>();
  await runWithConcurrency(jobs, PUSH_CONCURRENCY, async (job) => {
    const outcome = await deliverToSubscription(job.sub, job.body, job.ttl);
    const list = outcomesByItem.get(job.itemIndex) ?? [];
    list.push(outcome);
    outcomesByItem.set(job.itemIndex, list);
  });

  return items.map((_, idx): PushResult => {
    const outcomes = outcomesByItem.get(idx);
    if (!outcomes || outcomes.length === 0) return 'no_subscription';
    if (outcomes.includes('ok')) return 'sent';
    if (outcomes.every((o) => o === 'gone')) return 'no_subscription';
    return 'failed';
  });
}

// نوتیف Web Push به یک کاربر خاص (روی همه‌ی دستگاه‌هایی که توشون subscribe کرده)
export async function sendWebPushToUser(userId: string, payload: PushPayload) {
  await sendWebPushBatch([{ userId, payload }]);
}

const REMINDER_TTL_SECONDS = 6 * 60 * 60; // یادآوری بعد از چند ساعت دیگر ارزشی ندارد

function reminderPayload(booking: { salonName: string; date: string; time: string }): PushPayload {
  return {
    title: '⏰ یادآوری نوبت',
    body: `فردا ساعت ${booking.time} نوبت ${booking.salonName} داری — ${booking.date}`,
    url: '/appointments',
    ttlSeconds: REMINDER_TTL_SECONDS,
  };
}

// یادآوری نوبت ۲۴ ساعت قبل برای یک کاربر
export async function notifyUserBookingReminderPush(
  userId: string,
  booking: { salonName: string; date: string; time: string }
) {
  await sendWebPushToUser(userId, reminderPayload(booking));
}

// یادآوری نوبت برای چندین کاربر در یک دسته (مسیر اصلی job یادآوری)
export async function notifyUsersBookingReminderPush(
  items: { userId: string; salonName: string; date: string; time: string }[]
): Promise<PushResult[]> {
  return sendWebPushBatch(
    items.map((i) => ({ userId: i.userId, payload: reminderPayload(i) }))
  );
}