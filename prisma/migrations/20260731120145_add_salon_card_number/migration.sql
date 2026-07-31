/*
  Warnings:
  - Made the column `cardNumber` on table `Salon` required.
  - سالن‌هایی که قبل از این فیچر ثبت شده‌اند و شماره کارتی ندارند، با رشته‌ی خالی
    پر می‌شوند تا مقید NOT NULL خطا ندهد. سالن‌دار باید بعداً از پروفایل/تنظیمات
    کسب‌وکار، شماره کارت واقعی را وارد کند.
*/

-- Backfill existing NULL values before enforcing NOT NULL
UPDATE "Salon" SET "cardNumber" = '' WHERE "cardNumber" IS NULL;

-- AlterTable
ALTER TABLE "Salon" ALTER COLUMN "cardNumber" SET NOT NULL;
