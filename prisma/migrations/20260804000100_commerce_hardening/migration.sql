-- Payment states used to prevent stale callbacks and late-payment overselling.
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_REVIEW';
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'REQUIRES_REVIEW';

ALTER TABLE "payment_attempts"
  ADD COLUMN IF NOT EXISTS "activeKey" VARCHAR(180),
  ADD COLUMN IF NOT EXISTS "verificationStartedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "verificationLeaseExpiresAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "payment_attempts_activeKey_key"
  ON "payment_attempts"("activeKey");
CREATE INDEX IF NOT EXISTS "payment_attempts_verificationLeaseExpiresAt_idx"
  ON "payment_attempts"("verificationLeaseExpiresAt");

CREATE TABLE IF NOT EXISTS "rate_limit_buckets" (
  "key" VARCHAR(190) PRIMARY KEY,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "rate_limit_buckets_resetAt_idx"
  ON "rate_limit_buckets"("resetAt");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rate_limit_count_nonnegative') THEN
    ALTER TABLE "rate_limit_buckets" ADD CONSTRAINT "rate_limit_count_nonnegative" CHECK ("count" >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_stock_nonnegative') THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_stock_nonnegative" CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_prices_nonnegative') THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_prices_nonnegative" CHECK (
      (price IS NULL OR price >= 0) AND
      ("compareAtPrice" IS NULL OR "compareAtPrice" >= 0) AND
      ("makingChargeFixed" >= 0) AND
      ("makingChargePerGram" >= 0) AND
      ("makingChargePercent" >= 0 AND "makingChargePercent" <= 100) AND
      ("artisticFee" >= 0) AND
      ("profitPercent" IS NULL OR ("profitPercent" >= 0 AND "profitPercent" <= 100)) AND
      ("taxPercent" IS NULL OR ("taxPercent" >= 0 AND "taxPercent" <= 100))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'products_purity_range') THEN
    ALTER TABLE "products" ADD CONSTRAINT "products_purity_range" CHECK ("purityFineness" IS NULL OR ("purityFineness" BETWEEN 1 AND 1000));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variants_stock_nonnegative') THEN
    ALTER TABLE "product_variants" ADD CONSTRAINT "variants_stock_nonnegative" CHECK (stock >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'variants_values_nonnegative') THEN
    ALTER TABLE "product_variants" ADD CONSTRAINT "variants_values_nonnegative" CHECK (
      (price IS NULL OR price >= 0) AND
      ("makingChargeFixed" IS NULL OR "makingChargeFixed" >= 0) AND
      ("makingChargePerGram" IS NULL OR "makingChargePerGram" >= 0) AND
      ("makingChargePercent" IS NULL OR ("makingChargePercent" >= 0 AND "makingChargePercent" <= 100)) AND
      ("artisticFee" IS NULL OR "artisticFee" >= 0) AND
      ("purityFineness" IS NULL OR ("purityFineness" BETWEEN 1 AND 1000))
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pricing_policy_ranges') THEN
    ALTER TABLE "pricing_policies" ADD CONSTRAINT "pricing_policy_ranges" CHECK (
      "referencePurity" BETWEEN 1 AND 1000 AND
      "defaultProfitPercent" BETWEEN 0 AND 100 AND
      "defaultTaxPercent" BETWEEN 0 AND 100 AND
      "quoteTtlSeconds" > 0 AND
      "staleAfterMinutes" > 0 AND
      "closedMarketMaxAgeMinutes" > 0 AND
      "closedMarketSafetyMarginPercent" BETWEEN 0 AND 100 AND
      "roundingStep" > 0
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_money_nonnegative') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_money_nonnegative" CHECK (
      "subtotalToman" >= 0 AND "shippingToman" >= 0 AND "discountToman" >= 0 AND "payableToman" >= 0
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_total_consistency') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_total_consistency" CHECK (
      "payableToman" = GREATEST("subtotalToman" + "shippingToman" - "discountToman", 0)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_reservation_dates') THEN
    ALTER TABLE "orders" ADD CONSTRAINT "orders_reservation_dates" CHECK (
      "priceExpiresAt" >= "priceVerifiedAt" AND "inventoryExpiresAt" >= "inventoryReservedAt"
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_items_positive_values') THEN
    ALTER TABLE "order_items" ADD CONSTRAINT "order_items_positive_values" CHECK (
      quantity > 0 AND "unitPriceToman" >= 0 AND "lineTotalToman" >= 0 AND
      "lineTotalToman" = "unitPriceToman" * quantity AND
      "stockBeforeReservation" >= 0 AND "stockAfterReservation" >= 0
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_amount_positive') THEN
    ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_amount_positive" CHECK ("amountToman" > 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "cron_leases" (
  "key" VARCHAR(100) PRIMARY KEY,
  "holder" VARCHAR(128) NOT NULL,
  "lockedUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "cron_leases_lockedUntil_idx" ON "cron_leases"("lockedUntil");

CREATE TABLE IF NOT EXISTS "admin_sessions" (
  "id" UUID PRIMARY KEY,
  "sessionHash" VARCHAR(64) NOT NULL UNIQUE,
  "ipHash" VARCHAR(64),
  "userAgent" VARCHAR(500),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "admin_sessions_expiresAt_idx" ON "admin_sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "admin_sessions_revokedAt_idx" ON "admin_sessions"("revokedAt");

CREATE TABLE IF NOT EXISTS "admin_security_events" (
  "id" UUID PRIMARY KEY,
  "eventType" VARCHAR(100) NOT NULL,
  "successful" BOOLEAN NOT NULL,
  "ipHash" VARCHAR(64),
  "userAgent" VARCHAR(500),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "admin_security_events_eventType_createdAt_idx" ON "admin_security_events"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "admin_security_events_successful_createdAt_idx" ON "admin_security_events"("successful", "createdAt");
