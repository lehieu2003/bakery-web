DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationDispatchStatus') THEN
    CREATE TYPE "NotificationDispatchStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "NotificationDispatch" (
  "id" TEXT NOT NULL,
  "correlationKey" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "targetUserId" TEXT,
  "targetEmail" TEXT,
  "status" "NotificationDispatchStatus" NOT NULL DEFAULT 'PENDING',
  "channel" TEXT,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "notificationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),

  CONSTRAINT "NotificationDispatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "NotificationDispatch_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "NotificationDispatch_targetUserId_fkey"
    FOREIGN KEY ("targetUserId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationDispatch_correlationKey_key"
  ON "NotificationDispatch"("correlationKey");

CREATE INDEX IF NOT EXISTS "NotificationDispatch_eventType_createdAt_idx"
  ON "NotificationDispatch"("eventType", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS "NotificationDispatch_status_updatedAt_idx"
  ON "NotificationDispatch"("status", "updatedAt" DESC);

CREATE INDEX IF NOT EXISTS "NotificationDispatch_targetUserId_createdAt_idx"
  ON "NotificationDispatch"("targetUserId", "createdAt" DESC);
