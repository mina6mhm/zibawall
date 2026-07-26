-- AlterTable
ALTER TABLE "Appointment" ADD COLUMN     "hiddenForCustomer" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hiddenForSalon" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "depositAmount" SET DEFAULT 20000;
