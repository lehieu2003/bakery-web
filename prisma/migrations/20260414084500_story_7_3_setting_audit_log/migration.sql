-- CreateTable
CREATE TABLE "SettingAuditLog" (
    "id" TEXT NOT NULL,
    "settingKey" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "UserRole",
    "mutationType" TEXT NOT NULL,
    "beforeValue" TEXT,
    "afterValue" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SettingAuditLog_settingKey_createdAt_idx" ON "SettingAuditLog"("settingKey", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "SettingAuditLog_actorUserId_createdAt_idx" ON "SettingAuditLog"("actorUserId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "SettingAuditLog" ADD CONSTRAINT "SettingAuditLog_settingKey_fkey" FOREIGN KEY ("settingKey") REFERENCES "Setting"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettingAuditLog" ADD CONSTRAINT "SettingAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;