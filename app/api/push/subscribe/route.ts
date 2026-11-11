// app/api/push/subscribe/route.ts
// ذخیره‌ی subscription مرورگر یک کاربر (ادمین یا کاربر عادی) برای دریافت Web Push.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/requireUser';
import { rateLimit } from '@/lib/rateLimit';
import { isHttpUrl } from '@/lib/validate';
import { parseJsonBody, tooManyRequests } from '@/lib/http';

// هر کاربر چند دستگاه/مرورگر دارد ولی نه بی‌نهایت؛ بدون سقف می‌شد جدول را با endpointهای ساختگی پر کرد
// (و هر ارسال پوش هم روی همه‌ی آن‌ها اجرا می‌شود)
const MAX_SUBSCRIPTIONS_PER_USER = 20;
const MAX_ENDPOINT_LENGTH = 2048;
const MAX_KEY_LENGTH = 512;

export async function POST(req: Request) {
  const auth = await requireUser();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const limit = await rateLimit(`push-subscribe:${auth.user.id}`, 30, 10 * 60 * 1000);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);

    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;
    const body = parsed.body;

    const subscription = (body.subscription && typeof body.subscription === 'object'
      ? body.subscription
      : body) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh;
    const authKey = subscription.keys?.auth;

    if (
      typeof endpoint !== 'string' ||
      typeof p256dh !== 'string' ||
      typeof authKey !== 'string' ||
      !endpoint ||
      !p256dh ||
      !authKey
    ) {
      return NextResponse.json({ error: 'اطلاعات subscription ناقص است' }, { status: 400 });
    }
    if (
      !isHttpUrl(endpoint, MAX_ENDPOINT_LENGTH) ||
      p256dh.length > MAX_KEY_LENGTH ||
      authKey.length > MAX_KEY_LENGTH
    ) {
      return NextResponse.json({ error: 'اطلاعات subscription نامعتبر است' }, { status: 400 });
    }

    const userAgent = (req.headers.get('user-agent') || '').slice(0, 300) || null;

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: { endpoint, p256dh, auth: authKey, userId: auth.user.id, userAgent },
      update: { p256dh, auth: authKey, userId: auth.user.id, userAgent },
    });

    // اگر تعداد از سقف گذشت، قدیمی‌ترین‌ها پاک می‌شوند (آخرین ثبت‌نام همیشه می‌ماند)
    const total = await prisma.pushSubscription.count({ where: { userId: auth.user.id } });
    if (total > MAX_SUBSCRIPTIONS_PER_USER) {
      const stale = await prisma.pushSubscription.findMany({
        where: { userId: auth.user.id },
        orderBy: { createdAt: 'asc' },
        take: total - MAX_SUBSCRIPTIONS_PER_USER,
        select: { id: true },
      });
      if (stale.length > 0) {
        await prisma.pushSubscription.deleteMany({ where: { id: { in: stale.map((s) => s.id) } } });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'خطای سرور در ذخیره‌ی subscription' }, { status: 500 });
  }
}
