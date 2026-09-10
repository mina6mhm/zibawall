// scripts/remove-fake-salons.js
//
// همه‌ی سالن‌های فیکی که با scripts/seed-fake-salons.js ساخته شدند را
// یکجا حذف می‌کند. چون رابطه‌ی Salon → User با onDelete: Cascade تعریف
// شده، فقط کافیست کاربرهای فیک (owner) حذف شوند؛ خودِ سالن‌ها و هر چیز
// وابسته به آن‌ها (مدیر/socials/نظرات و ...) به‌طور خودکار پاک می‌شوند.
//
// اجرا:
//   node scripts/remove-fake-salons.js

const fs = require('fs');
const path = require('path');

if (!process.env.DATABASE_URL) {
  for (const envFile of ['.env', '.env.local']) {
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const idx = trimmed.indexOf('=');
        if (idx === -1) continue;
        const key = trimmed.slice(0, idx).trim();
        let value = trimmed.slice(idx + 1).trim();
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) process.env[key] = value;
      }
    }
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FAKE_PHONE_PREFIX = '0900000';

async function main() {
  const fakeOwners = await prisma.user.findMany({
    where: { phone: { startsWith: FAKE_PHONE_PREFIX } },
    select: { id: true, phone: true },
  });

  if (fakeOwners.length === 0) {
    console.log('هیچ سالن فیکی پیدا نشد (احتمالاً قبلاً حذف شده‌اند).');
    return;
  }

  const { count } = await prisma.user.deleteMany({
    where: { id: { in: fakeOwners.map((u) => u.id) } },
  });

  console.log(`✅ ${count} کاربر فیک (و سالن/مدیر/نظرات وابسته به هرکدام) حذف شد.`);
}

main()
  .catch((err) => {
    console.error('❌ خطا در حذف سالن‌های فیک:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });