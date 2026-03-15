-- CreateEnum
CREATE TYPE "ProductAttributeType" AS ENUM ('SELECT', 'MULTI_SELECT', 'TEXT', 'NUMBER', 'BOOLEAN');

-- CreateTable
CREATE TABLE "ProductAttribute" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" "ProductAttributeType" NOT NULL DEFAULT 'SELECT',
    "description" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isFilterable" BOOLEAN NOT NULL DEFAULT true,
    "isVariantAxis" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttribute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeValue" (
    "id" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "colorHex" TEXT,
    "imageUrl" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAttributeAssignment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "attributeId" TEXT NOT NULL,
    "valueId" TEXT,
    "valueKey" TEXT NOT NULL,
    "textValue" TEXT,
    "numberValue" DECIMAL(10,2),
    "booleanValue" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductAttributeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_slug_key" ON "ProductAttribute"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttribute_code_key" ON "ProductAttribute"("code");

-- CreateIndex
CREATE INDEX "ProductAttribute_isActive_isFilterable_displayOrder_idx" ON "ProductAttribute"("isActive", "isFilterable", "displayOrder");

-- CreateIndex
CREATE INDEX "ProductAttribute_type_idx" ON "ProductAttribute"("type");

-- CreateIndex
CREATE INDEX "ProductAttributeValue_attributeId_isActive_displayOrder_idx" ON "ProductAttributeValue"("attributeId", "isActive", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_attributeId_slug_key" ON "ProductAttributeValue"("attributeId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeValue_attributeId_value_key" ON "ProductAttributeValue"("attributeId", "value");

-- CreateIndex
CREATE INDEX "ProductAttributeAssignment_productId_idx" ON "ProductAttributeAssignment"("productId");

-- CreateIndex
CREATE INDEX "ProductAttributeAssignment_attributeId_idx" ON "ProductAttributeAssignment"("attributeId");

-- CreateIndex
CREATE INDEX "ProductAttributeAssignment_valueId_idx" ON "ProductAttributeAssignment"("valueId");

-- CreateIndex
CREATE INDEX "ProductAttributeAssignment_attributeId_valueId_idx" ON "ProductAttributeAssignment"("attributeId", "valueId");

-- CreateIndex
CREATE INDEX "ProductAttributeAssignment_attributeId_textValue_idx" ON "ProductAttributeAssignment"("attributeId", "textValue");

-- CreateIndex
CREATE INDEX "ProductAttributeAssignment_attributeId_numberValue_idx" ON "ProductAttributeAssignment"("attributeId", "numberValue");

-- CreateIndex
CREATE INDEX "ProductAttributeAssignment_attributeId_booleanValue_idx" ON "ProductAttributeAssignment"("attributeId", "booleanValue");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAttributeAssignment_productId_attributeId_valueKey_key" ON "ProductAttributeAssignment"("productId", "attributeId", "valueKey");

-- CreateIndex
CREATE INDEX "Product_isActive_price_idx" ON "Product"("isActive", "price");

-- CreateIndex
CREATE INDEX "Product_stock_trackStock_idx" ON "Product"("stock", "trackStock");

-- AddForeignKey
ALTER TABLE "ProductAttributeValue" ADD CONSTRAINT "ProductAttributeValue_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeAssignment" ADD CONSTRAINT "ProductAttributeAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeAssignment" ADD CONSTRAINT "ProductAttributeAssignment_attributeId_fkey" FOREIGN KEY ("attributeId") REFERENCES "ProductAttribute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAttributeAssignment" ADD CONSTRAINT "ProductAttributeAssignment_valueId_fkey" FOREIGN KEY ("valueId") REFERENCES "ProductAttributeValue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
