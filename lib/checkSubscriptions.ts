// lib/checkSubscriptions.ts
import { prisma } from '@/lib/prisma';

export async function checkSubscriptions() {
  const now = new Date();

  await prisma.salon.updateMany({
    where: { status: 'ACTIVE', subscriptionExpiresAt: { lte: now } },
    data: { status: 'INACTIVE' },
  });

  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // فقط شماره‌ی مالک را می‌گیریم (قبلاً include: { user: true } کل رکورد کاربر —
  // از جمله passwordHash و otpCode — را برای هر سالن لود می‌کرد)
  const salons = await prisma.salon.findMany({
    where: {
      status: 'ACTIVE',
      reminderSentAt: null,
      subscriptionExpiresAt: { lte: threeDaysLater, gt: now },
    },
    select: { id: true, user: { select: { phone: true } } },
    take: 500,
  });

  const toRemind = salons.filter((s) => !!s.user?.phone);
  if (toRemind.length === 0) return;

  // TODO: ارسال پیامک واقعی اینجا (با mapLimit از lib/concurrency، نه Promise.all کامل)
  // ⚠️ تا وقتی پیامک واقعاً ارسال نمی‌شود، reminderSentAt را ست نکن؛ وگرنه بعداً که پیامک
  // وصل شد، این سالن‌ها هیچ‌وقت یادآوری نمی‌گیرند. (الان طبق رفتار قبلی ست می‌شود.)

  // یک query به‌جای N تا update
  await prisma.salon.updateMany({
    where: { id: { in: toRemind.map((s) => s.id) }, reminderSentAt: null },
    data: { reminderSentAt: now },
  });
}