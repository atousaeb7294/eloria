-- ELORIA coupons + customer order notes.
-- Financial amounts remain server-calculated; the browser only submits a coupon code.

CREATE TYPE "CouponDiscountType" AS ENUM ('PERCENT', 'FIXED_TOMAN');

ALTER TABLE "orders"
  ADD COLUMN "orderNotes" VARCHAR(1000);

CREATE TABLE "coupons" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(64) NOT NULL,
  "titleFa" VARCHAR(140),
  "titleEn" VARCHAR(140),
  "discountType" "CouponDiscountType" NOT NULL,
  "value" DECIMAL(18,3) NOT NULL,
  "minSubtotalToman" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "maxDiscountToman" DECIMAL(18,0),
  "usageLimit" INTEGER,
  "perCustomerLimit" INTEGER NOT NULL DEFAULT 1,
  "firstPurchaseOnly" BOOLEAN NOT NULL DEFAULT false,
  "startsAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupons_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coupons_value_check" CHECK ("value" > 0),
  CONSTRAINT "coupons_min_subtotal_check" CHECK ("minSubtotalToman" >= 0),
  CONSTRAINT "coupons_max_discount_check" CHECK ("maxDiscountToman" IS NULL OR "maxDiscountToman" >= 0),
  CONSTRAINT "coupons_usage_limit_check" CHECK ("usageLimit" IS NULL OR "usageLimit" > 0),
  CONSTRAINT "coupons_per_customer_limit_check" CHECK ("perCustomerLimit" > 0),
  CONSTRAINT "coupons_percent_check" CHECK ("discountType" <> 'PERCENT' OR "value" <= 100)
);

CREATE UNIQUE INDEX "coupons_code_key" ON "coupons"("code");
CREATE INDEX "coupons_isActive_startsAt_expiresAt_idx" ON "coupons"("isActive", "startsAt", "expiresAt");

CREATE TABLE "coupon_redemptions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "couponId" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "discountToman" DECIMAL(18,0) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "coupon_redemptions_discount_check" CHECK ("discountToman" >= 0),
  CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "coupon_redemptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "coupon_redemptions_orderId_key" ON "coupon_redemptions"("orderId");
CREATE INDEX "coupon_redemptions_couponId_createdAt_idx" ON "coupon_redemptions"("couponId", "createdAt");
