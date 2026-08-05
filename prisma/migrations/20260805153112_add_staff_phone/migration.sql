/*
  Warnings:

  - A unique constraint covering the columns `[salonId,phone]` on the table `Staff` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `phone` to the `Staff` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "phone" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Staff_salonId_phone_key" ON "Staff"("salonId", "phone");
