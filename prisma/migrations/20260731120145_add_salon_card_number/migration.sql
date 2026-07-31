/*
  Warnings:

  - Made the column `cardNumber` on table `Salon` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Salon" ALTER COLUMN "cardNumber" SET NOT NULL;
