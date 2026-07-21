/*
  Warnings:

  - The values [EXPIRED] on the enum `SalonStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "SupportStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'ANSWERED', 'CLOSED');

-- AlterEnum
BEGIN;
CREATE TYPE "SalonStatus_new" AS ENUM ('PENDING_PAYMENT', 'ACTIVE', 'INACTIVE');
ALTER TABLE "public"."Salon" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Salon" ALTER COLUMN "status" TYPE "SalonStatus_new" USING ("status"::text::"SalonStatus_new");
ALTER TYPE "SalonStatus" RENAME TO "SalonStatus_old";
ALTER TYPE "SalonStatus_new" RENAME TO "SalonStatus";
DROP TYPE "public"."SalonStatus_old";
ALTER TABLE "Salon" ALTER COLUMN "status" SET DEFAULT 'PENDING_PAYMENT';
COMMIT;

-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "SupportMessage" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "SupportStatus" NOT NULL DEFAULT 'PENDING',
    "userId" TEXT NOT NULL,
    "phone" TEXT,
    "name" TEXT,
    "hadSalon" BOOLEAN NOT NULL DEFAULT false,
    "salonId" TEXT,
    "salonName" TEXT,
    "adminReply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "seenByUser" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupportMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportMessage_status_idx" ON "SupportMessage"("status");

-- CreateIndex
CREATE INDEX "SupportMessage_userId_idx" ON "SupportMessage"("userId");

-- CreateIndex
CREATE INDEX "SupportMessage_userId_seenByUser_idx" ON "SupportMessage"("userId", "seenByUser");

-- CreateIndex
CREATE INDEX "Salon_status_subscriptionExpiresAt_idx" ON "Salon"("status", "subscriptionExpiresAt");

-- AddForeignKey
ALTER TABLE "SupportMessage" ADD CONSTRAINT "SupportMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
