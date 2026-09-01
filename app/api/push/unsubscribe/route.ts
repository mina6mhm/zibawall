// app/api/push/unsubscribe/route.ts
// حذف subscription مرورگر (مثلاً وقتی ادمین دکمه‌ی «غیرفعال‌سازی نوتیف» رو می‌زنه).
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { endpoint } = await req.json();
    if (endpoint) {
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
