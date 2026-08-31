-- AlterTable
ALTER TABLE "SalonScheduleOverride" ADD COLUMN     "closedRanges" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "StaffScheduleOverride" ADD COLUMN     "closedRanges" JSONB NOT NULL DEFAULT '[]';
