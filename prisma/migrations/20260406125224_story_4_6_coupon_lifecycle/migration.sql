/*
  Warnings:

  - Added the required column `updatedAt` to the `Coupon` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "CouponSourceType" AS ENUM ('PUBLIC', 'TARGETED', 'TRIGGERED');

-- CreateEnum
CREATE TYPE "CouponRedemptionState" AS ENUM ('RESERVED', 'COMMITTED', 'RELEASED');

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "perUserLimit" INTEGER,
ADD COLUMN     "scopeCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "scopeProductIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "sourceType" "CouponSourceType" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CouponAssignment" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "userId" TEXT,
    "issuedById" TEXT,
    "targetSegment" "MemberLevel",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponRedemption" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT,
    "state" "CouponRedemptionState" NOT NULL DEFAULT 'RESERVED',
    "reservedDiscount" DECIMAL(10,2) NOT NULL,
    "reservedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "committedAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CouponRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouponAuditLog" (
    "id" TEXT NOT NULL,
    "couponId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorRole" "UserRole",
    "mutationType" TEXT NOT NULL,
    "beforeData" JSONB,
    "afterData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CouponAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CouponAssignment_couponId_isActive_idx" ON "CouponAssignment"("couponId", "isActive");

-- CreateIndex
CREATE INDEX "CouponAssignment_userId_isActive_idx" ON "CouponAssignment"("userId", "isActive");

-- CreateIndex
CREATE INDEX "CouponAssignment_targetSegment_isActive_idx" ON "CouponAssignment"("targetSegment", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "CouponRedemption_orderId_key" ON "CouponRedemption"("orderId");

-- CreateIndex
CREATE INDEX "CouponRedemption_couponId_state_idx" ON "CouponRedemption"("couponId", "state");

-- CreateIndex
CREATE INDEX "CouponRedemption_userId_state_idx" ON "CouponRedemption"("userId", "state");

-- CreateIndex
CREATE INDEX "CouponAuditLog_couponId_createdAt_idx" ON "CouponAuditLog"("couponId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CouponAuditLog_actorUserId_createdAt_idx" ON "CouponAuditLog"("actorUserId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CouponAssignment" ADD CONSTRAINT "CouponAssignment_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponAssignment" ADD CONSTRAINT "CouponAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponAssignment" ADD CONSTRAINT "CouponAssignment_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponRedemption" ADD CONSTRAINT "CouponRedemption_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponAuditLog" ADD CONSTRAINT "CouponAuditLog_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouponAuditLog" ADD CONSTRAINT "CouponAuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

