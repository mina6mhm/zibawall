-- AlterTable
ALTER TABLE "Booking" ALTER COLUMN "appFee" SET DEFAULT 30000;

-- AlterTable
ALTER TABLE "BookingGroup" ALTER COLUMN "appFee" SET DEFAULT 30000;

-- AlterTable
ALTER TABLE "BookingService" ADD COLUMN     "depositAmount" INTEGER NOT NULL DEFAULT 0;
