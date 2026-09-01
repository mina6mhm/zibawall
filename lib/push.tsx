// lib/push.ts
// ارسال نوتیف مستقیم از خود اپ به ادمین‌ها با Web Push، بدون نیاز به تلگرام یا Firebase.
//
// راه‌اندازی:
// ۱. دو خط زیر از قبل توی .env تولید و اینجا نوشته شده — همینا رو کپی کن:
//    NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOAXOdAYm4PpMvnUoDS-TD8ESs-LDDEol1VcG46YhXC0hAc6THtMs5XZsTuLbj3KnHEtby_JXNgfleZhdh5Fh-o
//    VAPID_PRIVATE_KEY=doHqT2uuec3woz5_ezW_EL6WumfLBglZGsrE6k7y9Xk
//    VAPID_SUBJECT=mailto:zibawallapp@gmail.com  (یک ایمیل واقعی خودت بذار، اختیاریه ولی بهتره ست بشه)
// ۲. با اکانت ادمین وارد سایت شو → پنل مدیریت → «فعال‌سازی نوتیف مرورگر» رو بزن و اجازه بده.
//    از همون لحظه، هر مرورگری که این دکمه رو بزنه، نوتیف پوش می‌گیره.
//
// این کاملاً مستقل از سیستم تلگرام (lib/telegram.ts) هست و به اون کاری نداره.

import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

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
};

// نوتیف Web Push به تمام مرورگرهایی که یک ادمین (role=ADMIN) توشون subscribe کرده.
// عمداً throw نمی‌کنه؛ نبود تنظیمات یا خطای ارسال نباید جریان اصلی (ثبت سالن و ...) رو بشکنه.
export async function sendWebPushToAdmins(payload: PushPayload) {
  if (!ensureVapidConfigured()) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { user: { role: 'ADMIN' } },
  });

  if (subscriptions.length === 0) return;

  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || '/admin/salons',
  });

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          notificationPayload
        );
      } catch (err: any) {
        // ۴۰۴/۴۱۰ یعنی subscription منقضی یا توسط کاربر لغو شده — از دیتابیس پاکش کن
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          console.error(`❌ Web push error for subscription ${sub.id}:`, err?.statusCode, err?.body || err);
        }
      }
    })
  );
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
