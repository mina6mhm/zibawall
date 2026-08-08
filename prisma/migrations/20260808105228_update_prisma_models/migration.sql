-- CreateTable
CREATE TABLE "BookingService" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "depositAmount" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffBookingService" (
    "staffId" TEXT NOT NULL,
    "bookingServiceId" TEXT NOT NULL,

    CONSTRAINT "StaffBookingService_pkey" PRIMARY KEY ("staffId","bookingServiceId")
);

-- CreateTable
CREATE TABLE "SalonSchedule" (
    "id" TEXT NOT NULL,
    "salonId" TEXT NOT NULL,
    "weeklySchedule" JSONB NOT NULL DEFAULT '{}',
    "gridMinutes" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalonSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffScheduleOverride" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "isDayOff" BOOLEAN NOT NULL DEFAULT false,
    "start" TEXT,
    "end" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffScheduleOverride_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookingService_salonId_idx" ON "BookingService"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "SalonSchedule_salonId_key" ON "SalonSchedule"("salonId");

-- CreateIndex
CREATE INDEX "StaffScheduleOverride_staffId_idx" ON "StaffScheduleOverride"("staffId");

-- CreateIndex
CREATE INDEX "StaffScheduleOverride_date_idx" ON "StaffScheduleOverride"("date");

-- CreateIndex
CREATE UNIQUE INDEX "StaffScheduleOverride_staffId_date_key" ON "StaffScheduleOverride"("staffId", "date");

-- AddForeignKey
ALTER TABLE "BookingService" ADD CONSTRAINT "BookingService_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffBookingService" ADD CONSTRAINT "StaffBookingService_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffBookingService" ADD CONSTRAINT "StaffBookingService_bookingServiceId_fkey" FOREIGN KEY ("bookingServiceId") REFERENCES "BookingService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonSchedule" ADD CONSTRAINT "SalonSchedule_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "Salon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffScheduleOverride" ADD CONSTRAINT "StaffScheduleOverride_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
