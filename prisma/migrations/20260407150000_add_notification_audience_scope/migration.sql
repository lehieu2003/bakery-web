-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('GLOBAL', 'USER');

-- AlterTable
ALTER TABLE "Notification"
ADD COLUMN "audience" "NotificationAudience" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN "targetUserId" TEXT;

-- CreateIndex
CREATE INDEX "Notification_audience_targetUserId_status_publishedAt_idx"
ON "Notification"("audience", "targetUserId", "status", "publishedAt" DESC);

-- AddForeignKey
ALTER TABLE "Notification"
ADD CONSTRAINT "Notification_targetUserId_fkey"
FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
