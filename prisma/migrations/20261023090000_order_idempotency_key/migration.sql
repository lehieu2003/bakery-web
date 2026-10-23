-- Checkout idempotency: a retried POST /api/orders carrying the same
-- Idempotency-Key returns the order it already created. Nullable, so existing
-- orders and clients that send no key are unaffected (NULLs never collide).
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT;

-- The gateway link is kept so that retry can return it: MoMo refuses a
-- second create for the same orderId.
ALTER TABLE "Payment" ADD COLUMN "payUrl" TEXT;

CREATE UNIQUE INDEX "Order_idempotencyKey_key" ON "Order"("idempotencyKey");
