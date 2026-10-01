-- Refresh token rotation: a consumed session is kept (with revokedAt set)
-- so replaying it can be detected and all of the user's sessions revoked.
ALTER TABLE "Session" ADD COLUMN "revokedAt" TIMESTAMP(3);
