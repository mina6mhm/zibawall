-- CreateTable
CREATE TABLE "SalonManager" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "label" TEXT,
    "salonId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonManager_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalonManager_salonId_idx" ON "SalonManager"("salonId");

-- CreateIndex
CREATE INDEX "SalonManager_phone_idx" ON "SalonManager"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "SalonManager_salonId_phone_key" ON "SalonManager"("salonId", "phone");

-- AddForeignKey
ALTER TABLE "SalonManager" ADD CONSTRAINT "SalonManager_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;
