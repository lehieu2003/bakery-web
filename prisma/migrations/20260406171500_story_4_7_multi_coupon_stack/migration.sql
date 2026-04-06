-- Allow multiple coupon redemptions per order while preventing duplicate coupon/order pairs
ALTER TABLE "CouponRedemption"
  DROP CONSTRAINT IF EXISTS "CouponRedemption_orderId_key";

DROP INDEX IF EXISTS "CouponRedemption_orderId_key";

CREATE UNIQUE INDEX IF NOT EXISTS "CouponRedemption_couponId_orderId_key"
  ON "CouponRedemption"("couponId", "orderId");

CREATE INDEX IF NOT EXISTS "CouponRedemption_orderId_state_idx"
  ON "CouponRedemption"("orderId", "state");
