-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('ONLINE', 'MANUAL', 'BLOCKED');

-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_customerId_fkey";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "source" "BookingSource" NOT NULL DEFAULT 'ONLINE',
ALTER COLUMN "customerId" DROP NOT NULL,
ALTER COLUMN "categoryName" DROP NOT NULL,
ALTER COLUMN "serviceName" DROP NOT NULL,
ALTER COLUMN "customerName" DROP NOT NULL,
ALTER COLUMN "customerPhone" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
