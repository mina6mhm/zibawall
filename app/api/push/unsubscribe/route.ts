// app/api/push/unsubscribe/route.ts
// حذف subscription مرورگر یک کاربر (مثلاً وقتی ادمین دکمه‌ی «غیرفعال‌سازی نوتیف» رو می‌زنه).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/requireUser';
import { parseJsonBody } from '@/lib/http';

export async function POST(req: Request) {
  const auth = await requireUser();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const parsed = await parseJsonBody(req);
    if (!parsed.ok) return parsed.response;
    const { endpoint } = parsed.body;

    if (typeof endpoint === 'string' && endpoint) {
      await prisma.pushSubscription.deleteMany({
        where: { endpoint, userId: auth.user.id },
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    return NextResponse.json({ error: 'خطای سرور در حذف subscription' }, { status: 500 });
  }
}
