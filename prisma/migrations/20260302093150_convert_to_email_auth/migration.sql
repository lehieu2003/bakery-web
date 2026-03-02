/*
  Warnings:

  - You are about to drop the column `phone` on the `OtpVerification` table. All the data in the column will be lost.
  - You are about to drop the column `phoneVerifiedAt` on the `User` table. All the data in the column will be lost.
  - Added the required column `email` to the `OtpVerification` table without a default value. This is not possible if the table is not empty.
  - Made the column `email` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `password` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- DropIndex
DROP INDEX "OtpVerification_phone_purpose_expiresAt_idx";

-- DropIndex
DROP INDEX "User_phone_idx";

-- DropIndex
DROP INDEX "User_phone_key";

-- AlterTable
ALTER TABLE "OtpVerification" DROP COLUMN "phone",
ADD COLUMN     "email" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "phoneVerifiedAt",
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ALTER COLUMN "phone" DROP NOT NULL,
ALTER COLUMN "email" SET NOT NULL,
ALTER COLUMN "password" SET NOT NULL;

-- CreateIndex
CREATE INDEX "OtpVerification_email_purpose_expiresAt_idx" ON "OtpVerification"("email", "purpose", "expiresAt");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");
