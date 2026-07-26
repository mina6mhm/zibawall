/*
  Warnings:

  - You are about to drop the `Staff` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Visit` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('NEGOTIATING', 'AWAITING_PAYMENT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AppointmentSender" AS ENUM ('CUSTOMER', 'SALON');

-- DropForeignKey
ALTER TABLE "Staff" DROP CONSTRAINT "Staff_salonId_fkey";

-- DropForeignKey
ALTER TABLE "Visit" DROP CONSTRAINT "Visit_salonId_fkey";

-- DropTable
DROP TABLE "Staff";

-- DropTable
DROP TABLE "Visit";

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'NEGOTIATING',
    "customerId" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "visitDate" TIMESTAMP(3),
    "checkInTime" TEXT,
    "checkOutTime" TEXT,
    "services" JSONB NOT NULL DEFAULT '[]',
    "totalAmount" INTEGER NOT NULL DEFAULT 0,
    "depositAmount" INTEGER NOT NULL DEFAULT 30000,
    "depositStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "authority" TEXT,
    "refId" TEXT,
    "seenByCustomer" BOOLEAN NOT NULL DEFAULT true,
    "seenBySalon" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppointmentMessage" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sender" "AppointmentSender" NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AppointmentMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_authority_key" ON "Appointment"("authority");

-- CreateIndex
CREATE INDEX "Appointment_salonId_idx" ON "Appointment"("salonId");

-- CreateIndex
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");

-- CreateIndex
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

-- CreateIndex
CREATE INDEX "Appointment_salonId_visitDate_idx" ON "Appointment"("salonId", "visitDate");

-- CreateIndex
CREATE INDEX "AppointmentMessage_appointmentId_idx" ON "AppointmentMessage"("appointmentId");

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
