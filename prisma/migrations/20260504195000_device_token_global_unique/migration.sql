DROP INDEX IF EXISTS "DeviceToken_userId_token_key";
CREATE UNIQUE INDEX "DeviceToken_token_key" ON "DeviceToken"("token");
