-- CreateEnum
CREATE TYPE "GenderAudience" AS ENUM ('FEMALE', 'MALE', 'BOTH');

-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "genderAudience" "GenderAudience" NOT NULL DEFAULT 'BOTH',
ADD COLUMN     "hasHomeService" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Salon_hasHomeService_idx" ON "Salon"("hasHomeService");

-- CreateIndex
CREATE INDEX "Salon_genderAudience_idx" ON "Salon"("genderAudience");
