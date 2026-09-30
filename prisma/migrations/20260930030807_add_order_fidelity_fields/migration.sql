-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "pickupDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "message" TEXT;
