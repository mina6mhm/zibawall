/*
  Warnings:

  - You are about to drop the column `source` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the `BookingCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `SalonSchedule` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ServiceItem` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TimeBlock` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BookingCategory" DROP CONSTRAINT "BookingCategory_salonId_fkey";

-- DropForeignKey
ALTER TABLE "SalonSchedule" DROP CONSTRAINT "SalonSchedule_salonId_fkey";

-- DropForeignKey
ALTER TABLE "ServiceItem" DROP CONSTRAINT "ServiceItem_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "TimeBlock" DROP CONSTRAINT "TimeBlock_salonId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "source";

-- DropTable
DROP TABLE "BookingCategory";

-- DropTable
DROP TABLE "SalonSchedule";

-- DropTable
DROP TABLE "ServiceItem";

-- DropTable
DROP TABLE "TimeBlock";

-- DropEnum
DROP TYPE "BookingSource";
