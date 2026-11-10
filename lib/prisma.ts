// lib/prisma.ts
//
// نکته‌ی مهم برای تحمل فشار: اندازه‌ی Pool اتصال‌ها را در خود DATABASE_URL تنظیم کن، مثلاً:
//   DATABASE_URL="postgresql://...?connection_limit=10&pool_timeout=20"
// (هر instance سرور = یک Pool. تعداد instanceها × connection_limit باید زیر max_connections
// پستگرس بماند. اگر چند instance داری، PgBouncer جلوی دیتابیس بگذار و &pgbouncer=true اضافه کن.)
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['warn', 'error'],
  });

// در production هم روی globalThis نگه می‌داریم: instrumentation.ts (زمان‌بند) و
// route handlerها ممکن است در bundleهای جدا بالا بیایند و بدون این، هرکدام یک Pool جدا باز می‌کنند.
globalForPrisma.prisma = prisma;