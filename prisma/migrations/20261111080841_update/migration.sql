-- CreateTable
CREATE TABLE "PaymentAuthority" (
    "id" TEXT NOT NULL,
    "authority" TEXT NOT NULL,
    "bookingId" TEXT,
    "bookingGroupId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAuthority_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAuthority_authority_key" ON "PaymentAuthority"("authority");

-- CreateIndex
CREATE INDEX "PaymentAuthority_bookingId_idx" ON "PaymentAuthority"("bookingId");

-- CreateIndex
CREATE INDEX "PaymentAuthority_bookingGroupId_idx" ON "PaymentAuthority"("bookingGroupId");

-- CreateIndex
CREATE INDEX "PaymentAuthority_createdAt_idx" ON "PaymentAuthority"("createdAt");

-- AddForeignKey
ALTER TABLE "PaymentAuthority" ADD CONSTRAINT "PaymentAuthority_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAuthority" ADD CONSTRAINT "PaymentAuthority_bookingGroupId_fkey" FOREIGN KEY ("bookingGroupId") REFERENCES "BookingGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
