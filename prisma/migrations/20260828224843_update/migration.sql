-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "pinnedAt" TIMESTAMP(3),
ADD COLUMN     "pinnedUntil" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Salon_pinnedUntil_idx" ON "Salon"("pinnedUntil");
