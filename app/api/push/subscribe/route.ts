// app/api/push/subscribe/route.ts
// ذخیره‌ی subscription مرورگر یک ادمین برای دریافت Web Push.
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const subscription = body?.subscription || body;
    const endpoint: string | undefined = subscription?.endpoint;
    const p256dh: string | undefined = subscription?.keys?.p256dh;
    const authKey: string | undefined = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !authKey) {
      return NextResponse.json({ error: 'اطلاعات subscription ناقص است' }, { status: 400 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint },
      create: {
        endpoint,
        p256dh,
        auth: authKey,
        userId: auth.user.id,
        userAgent: req.headers.get('user-agent') || null,
      },
      update: {
        p256dh,
        auth: authKey,
        userId: auth.user.id,
        userAgent: req.headers.get('user-agent') || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving push subscription:', error);
    return NextResponse.json({ error: 'خطای سرور در ذخیره‌ی subscription' }, { status: 500 });
  }
}
