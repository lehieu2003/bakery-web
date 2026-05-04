CREATE TABLE "DeviceToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "platform" TEXT NOT NULL,
  "deviceId" TEXT,
  "appVersion" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "lastRegistered" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deactivatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "DeviceToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "DeviceToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "PushNotificationLog" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "token" TEXT,
  "eventType" TEXT NOT NULL,
  "correlationKey" TEXT,
  "status" TEXT NOT NULL,
  "error" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PushNotificationLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PushNotificationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DeviceToken_userId_token_key" ON "DeviceToken"("userId", "token");
CREATE INDEX "DeviceToken_userId_isActive_updatedAt_idx" ON "DeviceToken"("userId", "isActive", "updatedAt" DESC);
CREATE INDEX "DeviceToken_token_idx" ON "DeviceToken"("token");

CREATE INDEX "PushNotificationLog_userId_createdAt_idx" ON "PushNotificationLog"("userId", "createdAt" DESC);
CREATE INDEX "PushNotificationLog_eventType_createdAt_idx" ON "PushNotificationLog"("eventType", "createdAt" DESC);
CREATE INDEX "PushNotificationLog_status_createdAt_idx" ON "PushNotificationLog"("status", "createdAt" DESC);
