-- ZaloPay was replaced by VNPay (20260818145000) but that migration only added
-- the new value; legacy rows still hold 'ZALOPAY', which the Prisma client
-- (schema knows only COD/BANK_TRANSFER/MOMO/VNPAY) cannot map — every admin
-- order-list query 500s. Re-label those rows, then rebuild the enum without
-- ZALOPAY so the database matches the schema.
UPDATE "Order" SET "paymentMethod" = 'VNPAY' WHERE "paymentMethod" = 'ZALOPAY';

ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_old";
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'BANK_TRANSFER', 'MOMO', 'VNPAY');
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" TYPE "PaymentMethod" USING ("paymentMethod"::text::"PaymentMethod");
DROP TYPE "PaymentMethod_old";
