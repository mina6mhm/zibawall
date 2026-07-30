/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `categoryName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `depositStatus` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `durationMinutes` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `endTime` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `serviceId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `serviceName` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the column `staffId` on the `Booking` table. All the data in the column will be lost.
  - You are about to drop the `BookingCategory` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BookingService` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Staff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_BookingCategoryToStaff` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `services` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalAmount` to the `Booking` table without a default value. This is not possible if the table is not empty.
  - Made the column `customerPhone` on table `Booking` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_serviceId_fkey";

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_staffId_fkey";

-- DropForeignKey
ALTER TABLE "BookingCategory" DROP CONSTRAINT "BookingCategory_salonId_fkey";

-- DropForeignKey
ALTER TABLE "BookingService" DROP CONSTRAINT "BookingService_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "BookingService" DROP CONSTRAINT "BookingService_salonId_fkey";

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_salonId_fkey";

-- DropForeignKey
ALTER TABLE "_BookingCategoryToStaff" DROP CONSTRAINT "_BookingCategoryToStaff_A_fkey";

-- DropForeignKey
ALTER TABLE "_BookingCategoryToStaff" DROP CONSTRAINT "_BookingCategoryToStaff_B_fkey";

-- DropIndex
DROP INDEX "Booking_staffId_date_idx";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "categoryId",
DROP COLUMN "categoryName",
DROP COLUMN "depositStatus",
DROP COLUMN "durationMinutes",
DROP COLUMN "endTime",
DROP COLUMN "price",
DROP COLUMN "serviceId",
DROP COLUMN "serviceName",
DROP COLUMN "source",
DROP COLUMN "staffId",
ADD COLUMN     "appFee" INTEGER NOT NULL DEFAULT 20000,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reminderSentAt" TIMESTAMP(3),
ADD COLUMN     "services" JSONB NOT NULL,
ADD COLUMN     "totalAmount" INTEGER NOT NULL,
ALTER COLUMN "customerPhone" SET NOT NULL,
ALTER COLUMN "depositAmount" SET DEFAULT 0;

-- DropTable
DROP TABLE "BookingCategory";

-- DropTable
DROP TABLE "BookingService";

-- DropTable
DROP TABLE "Staff";

-- DropTable
DROP TABLE "_BookingCategoryToStaff";

-- DropEnum
DROP TYPE "BookingSource";

-- CreateIndex
CREATE INDEX "Booking_salonId_date_idx" ON "Booking"("salonId", "date");

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_idx" ON "Booking"("paymentStatus");
