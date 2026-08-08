-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "offDays" TEXT[] DEFAULT ARRAY[]::TEXT[];
