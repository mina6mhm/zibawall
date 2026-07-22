-- CreateEnum
CREATE TYPE "SenderRole" AS ENUM ('USER', 'ADMIN');

-- AlterTable
ALTER TABLE "SupportMessage" ADD COLUMN     "seenByAdmin" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "SupportReply" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sender" "SenderRole" NOT NULL,
    "ticketId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupportReply_ticketId_idx" ON "SupportReply"("ticketId");

-- CreateIndex
CREATE INDEX "SupportMessage_seenByAdmin_idx" ON "SupportMessage"("seenByAdmin");

-- AddForeignKey
ALTER TABLE "SupportReply" ADD CONSTRAINT "SupportReply_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
