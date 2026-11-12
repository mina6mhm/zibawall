-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "depositSettledAt" TIMESTAMP(3),
ADD COLUMN     "depositSettlementRef" TEXT;

-- CreateIndex
CREATE INDEX "Booking_paymentStatus_depositSettledAt_idx" ON "Booking"("paymentStatus", "depositSettledAt");
