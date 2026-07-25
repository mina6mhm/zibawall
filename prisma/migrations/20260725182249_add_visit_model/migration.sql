-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "customerName" TEXT,
    "visitDate" TIMESTAMP(3) NOT NULL,
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "services" JSONB NOT NULL DEFAULT '[]',
    "totalAmount" INTEGER NOT NULL,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "authority" TEXT,
    "refId" TEXT,
    "salonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visit_authority_key" ON "Visit"("authority");

-- CreateIndex
CREATE INDEX "Visit_salonId_idx" ON "Visit"("salonId");

-- CreateIndex
CREATE INDEX "Visit_customerPhone_idx" ON "Visit"("customerPhone");

-- CreateIndex
CREATE INDEX "Visit_paymentStatus_idx" ON "Visit"("paymentStatus");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
