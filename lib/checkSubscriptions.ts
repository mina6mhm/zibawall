//lib/checkSubscriptions.ts
import { prisma } from '@/lib/prisma';

export async function checkSubscriptions() {
  const now = new Date();
  await prisma.salon.updateMany({
    where: {
      status: 'ACTIVE',
      subscriptionExpiresAt: {
        lte: now,
      },
    },
    data: {
      status: 'INACTIVE',
    },
  });

  const threeDaysLater = new Date();

  threeDaysLater.setDate(
    threeDaysLater.getDate() + 3
  );

  const salons = await prisma.salon.findMany({
    where: {
      status: 'ACTIVE',

      reminderSentAt: null,

      subscriptionExpiresAt: {
        lte: threeDaysLater,
        gt: now,
      },
    },

    include: {
      user: true,
    },
  });

  for (const salon of salons) {

    if (!salon.user?.phone) continue;

    //  ارسال پیامک
    // await sendSms(...)

    await prisma.salon.update({
      where: {
        id: salon.id,
      },
      data: {
        reminderSentAt: new Date(),
      },
    });
  }
}