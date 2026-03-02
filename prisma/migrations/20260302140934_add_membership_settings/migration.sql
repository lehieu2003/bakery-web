-- CreateEnum
CREATE TYPE "MemberLevel" AS ENUM ('SILVER', 'GOLD', 'PLATINUM');

-- CreateEnum
CREATE TYPE "BannerPlacement" AS ENUM ('HOME_HERO', 'HOME_PROMO', 'CATEGORY');

-- AlterTable
ALTER TABLE "Banner" ADD COLUMN     "placement" "BannerPlacement" NOT NULL DEFAULT 'HOME_HERO',
ALTER COLUMN "imageUrl" DROP NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "memberLevel" "MemberLevel" NOT NULL DEFAULT 'SILVER',
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "Setting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Setting_key_key" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Setting_key_idx" ON "Setting"("key");

-- CreateIndex
CREATE INDEX "Banner_placement_idx" ON "Banner"("placement");

-- CreateIndex
CREATE INDEX "User_memberLevel_idx" ON "User"("memberLevel");
