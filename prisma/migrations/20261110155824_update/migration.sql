-- DropIndex
DROP INDEX "Booking_paymentStatus_idx";

-- DropIndex
DROP INDEX "Booking_salonId_date_idx";

-- DropIndex
DROP INDEX "Booking_status_idx";

-- DropIndex
DROP INDEX "Salon_status_idx";

-- DropIndex
DROP INDEX "SalonManager_salonId_idx";

-- DropIndex
DROP INDEX "SalonScheduleOverride_salonId_idx";

-- DropIndex
DROP INDEX "Staff_salonId_idx";

-- DropIndex
DROP INDEX "StaffScheduleOverride_staffId_idx";

-- DropIndex
DROP INDEX "User_email_idx";

-- DropIndex
DROP INDEX "User_phone_idx";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "confirmationSmsSentAt" TIMESTAMP(3),
ALTER COLUMN "appFee" SET DEFAULT 25000;

-- AlterTable
ALTER TABLE "BookingGroup" ALTER COLUMN "appFee" SET DEFAULT 25000;

-- CreateIndex
CREATE INDEX "Booking_salonId_date_status_idx" ON "Booking"("salonId", "date", "status");

-- CreateIndex
CREATE INDEX "Booking_date_status_idx" ON "Booking"("date", "status");

-- CreateIndex
CREATE INDEX "Booking_status_expiresAt_idx" ON "Booking"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "Booking_customerPhone_idx" ON "Booking"("customerPhone");

-- CreateIndex
CREATE INDEX "Payment_salonId_idx" ON "Payment"("salonId");

-- CreateIndex
CREATE INDEX "Review_salonId_idx" ON "Review"("salonId");

-- CreateIndex
CREATE INDEX "Salon_status_pinnedUntil_idx" ON "Salon"("status", "pinnedUntil");
