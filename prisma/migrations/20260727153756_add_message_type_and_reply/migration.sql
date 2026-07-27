-- CreateEnum
CREATE TYPE "AppointmentMessageType" AS ENUM ('TEXT', 'IMAGE', 'VOICE');

-- AlterTable
ALTER TABLE "AppointmentMessage" ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "mediaUrl" TEXT,
ADD COLUMN     "replyToId" TEXT,
ADD COLUMN     "seenAt" TIMESTAMP(3),
ADD COLUMN     "type" "AppointmentMessageType" NOT NULL DEFAULT 'TEXT',
ALTER COLUMN "message" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AppointmentMessage_replyToId_idx" ON "AppointmentMessage"("replyToId");

-- AddForeignKey
ALTER TABLE "AppointmentMessage" ADD CONSTRAINT "AppointmentMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "AppointmentMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;
