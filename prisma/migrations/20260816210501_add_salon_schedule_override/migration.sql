/*
  Warnings:

  - You are about to drop the column `depositAmount` on the `BookingService` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "BookingService" DROP COLUMN "depositAmount";

-- CreateTable
CREATE TABLE "SalonScheduleOverride" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT true,
    "start" TEXT,
    "end" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalonScheduleOverride_salonId_idx" ON "SalonScheduleOverride"("salonId");

-- CreateIndex
CREATE INDEX "SalonScheduleOverride_date_idx" ON "SalonScheduleOverride"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SalonScheduleOverride_salonId_date_key" ON "SalonScheduleOverride"("salonId", "date");

-- AddForeignKey
ALTER TABLE "SalonScheduleOverride" ADD CONSTRAINT "SalonScheduleOverride_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
