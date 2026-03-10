/*
  Warnings:

  - The values [GUEST] on the enum `UserRole` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `placement` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Banner` table. All the data in the column will be lost.
  - You are about to drop the column `customerNote` on the `Order` table. All the data in the column will be lost.
  - You are about to drop the column `paymentStatus` on the `Order` table. All the data in the column will be lost.
  - The `paymentMethod` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `lockedUntil` on the `OtpVerification` table. All the data in the column will be lost.
  - You are about to drop the column `sentCount` on the `OtpVerification` table. All the data in the column will be lost.
  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK_TRANSFER', 'MOMO', 'ZALOPAY');

-- CreateEnum
CREATE TYPE "MenuType" AS ENUM ('CATEGORY', 'PAGE', 'LINK');

-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'CUSTOMER');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING ("role"::text::"UserRole_new");
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'CUSTOMER';
COMMIT;

-- DropForeignKey
ALTER TABLE "Cart" DROP CONSTRAINT "Cart_userId_fkey";

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropIndex
DROP INDEX "Address_userId_idx";

-- DropIndex
DROP INDEX "Banner_isActive_displayOrder_idx";

-- DropIndex
DROP INDEX "Banner_placement_idx";

-- DropIndex
DROP INDEX "CartItem_cartId_idx";

-- DropIndex
DROP INDEX "Category_isActive_idx";

-- DropIndex
DROP INDEX "Category_parentId_idx";

-- DropIndex
DROP INDEX "Category_slug_idx";

-- DropIndex
DROP INDEX "Order_createdAt_idx";

-- DropIndex
DROP INDEX "Order_customerPhone_idx";

-- DropIndex
DROP INDEX "Order_orderNumber_idx";

-- DropIndex
DROP INDEX "Order_status_idx";

-- DropIndex
DROP INDEX "Order_userId_idx";

-- DropIndex
DROP INDEX "OrderItem_orderId_idx";

-- DropIndex
DROP INDEX "OrderItem_productId_idx";

-- DropIndex
DROP INDEX "OtpVerification_createdAt_idx";

-- DropIndex
DROP INDEX "OtpVerification_email_purpose_expiresAt_idx";

-- DropIndex
DROP INDEX "Product_categoryId_idx";

-- DropIndex
DROP INDEX "Product_isActive_isFeatured_idx";

-- DropIndex
DROP INDEX "Product_slug_idx";

-- DropIndex
DROP INDEX "ProductImage_productId_idx";

-- DropIndex
DROP INDEX "ProductVariant_productId_idx";

-- DropIndex
DROP INDEX "Review_productId_idx";

-- DropIndex
DROP INDEX "Session_expiresAt_idx";

-- DropIndex
DROP INDEX "Session_token_idx";

-- DropIndex
DROP INDEX "Session_userId_idx";

-- DropIndex
DROP INDEX "Setting_key_idx";

-- DropIndex
DROP INDEX "User_memberLevel_idx";

-- DropIndex
DROP INDEX "User_role_idx";

-- AlterTable
ALTER TABLE "Banner" DROP COLUMN "placement",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "Category" ADD COLUMN     "showInMenu" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Coupon" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maxDiscount" DECIMAL(65,30),
ALTER COLUMN "minOrder" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "customerNote",
DROP COLUMN "paymentStatus",
ALTER COLUMN "deliveryFee" DROP DEFAULT,
ALTER COLUMN "discount" DROP DEFAULT,
DROP COLUMN "paymentMethod",
ADD COLUMN     "paymentMethod" "PaymentMethod";

-- AlterTable
ALTER TABLE "OtpVerification" DROP COLUMN "lockedUntil",
DROP COLUMN "sentCount";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "categoryId",
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "costPrice" DECIMAL(65,30),
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "sku" TEXT,
ADD COLUMN     "trackStock" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weight" DOUBLE PRECISION,
ALTER COLUMN "comparePrice" SET DATA TYPE DECIMAL(65,30);

-- AlterTable
ALTER TABLE "ProductImage" ADD COLUMN     "altText" TEXT,
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0;

-- DropEnum
DROP TYPE "BannerPlacement";

-- CreateTable
CREATE TABLE "ProductCategory" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "transactionId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "parentId" TEXT,
    "categoryId" TEXT,
    "pageId" TEXT,
    "type" "MenuType" NOT NULL DEFAULT 'CATEGORY',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Page" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_slug_key" ON "Page"("slug");

-- CreateIndex
CREATE INDEX "OtpVerification_email_idx" ON "OtpVerification"("email");

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MenuItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE SET NULL ON UPDATE CASCADE;
