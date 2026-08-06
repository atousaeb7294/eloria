-- ELORIA reproducible baseline generated from prisma/schema.prisma.
-- This migration creates a fresh PostgreSQL database without relying on db push.

CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'ARCHIVED');
CREATE TYPE "Currency" AS ENUM ('TOMAN', 'USD');
CREATE TYPE "MaterialType" AS ENUM ('GOLD', 'SILVER');
CREATE TYPE "PricingMode" AS ENUM ('DYNAMIC', 'MANUAL');
CREATE TYPE "MakingChargeType" AS ENUM ('NONE', 'FIXED', 'PER_GRAM', 'PERCENT', 'COMBINED');
CREATE TYPE "OrderStatus" AS ENUM (
  'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'COMPLETED',
  'PAYMENT_FAILED', 'PAYMENT_REVIEW', 'CANCELLED', 'EXPIRED', 'REFUNDED'
);
CREATE TYPE "PaymentStatus" AS ENUM (
  'CREATED', 'REDIRECTED', 'PENDING_VERIFICATION', 'REQUIRES_REVIEW',
  'PAID', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'
);
CREATE TYPE "AuditActorType" AS ENUM ('SYSTEM', 'CUSTOMER', 'ADMIN', 'PAYMENT_GATEWAY');

CREATE TABLE "admin_sessions" (
  "id" UUID NOT NULL,
  "sessionHash" VARCHAR(64) NOT NULL,
  "ipHash" VARCHAR(64),
  "userAgent" VARCHAR(500),
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "admin_security_events" (
  "id" UUID NOT NULL,
  "eventType" VARCHAR(100) NOT NULL,
  "successful" BOOLEAN NOT NULL,
  "ipHash" VARCHAR(64),
  "userAgent" VARCHAR(500),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_security_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cron_leases" (
  "key" VARCHAR(100) NOT NULL,
  "holder" VARCHAR(128) NOT NULL,
  "lockedUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cron_leases_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "rate_limit_buckets" (
  "key" VARCHAR(190) NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "rate_limit_count_nonnegative" CHECK ("count" >= 0)
);

CREATE TABLE "collections" (
  "id" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "nameFa" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "descriptionFa" TEXT,
  "descriptionEn" TEXT,
  "imageUrl" TEXT,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
  "id" UUID NOT NULL,
  "collectionId" UUID NOT NULL,
  "slug" TEXT NOT NULL,
  "sku" TEXT,
  "nameFa" TEXT NOT NULL,
  "nameEn" TEXT NOT NULL,
  "descriptionFa" TEXT,
  "descriptionEn" TEXT,
  "material" "MaterialType" NOT NULL DEFAULT 'GOLD',
  "goldWeight" DECIMAL(10,3),
  "purity" TEXT,
  "purityFineness" INTEGER,
  "pricingMode" "PricingMode" NOT NULL DEFAULT 'DYNAMIC',
  "price" DECIMAL(18,0),
  "compareAtPrice" DECIMAL(18,0),
  "makingChargeType" "MakingChargeType" NOT NULL DEFAULT 'NONE',
  "makingChargeFixed" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "makingChargePerGram" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "makingChargePercent" DECIMAL(7,3) NOT NULL DEFAULT 0,
  "artisticFee" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "profitPercent" DECIMAL(7,3),
  "taxPercent" DECIMAL(7,3),
  "currency" "Currency" NOT NULL DEFAULT 'TOMAN',
  "legendFa" TEXT,
  "legendEn" TEXT,
  "stock" INTEGER NOT NULL DEFAULT 0,
  "specifications" JSONB,
  "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
  "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "products_stock_nonnegative" CHECK ("stock" >= 0),
  CONSTRAINT "products_prices_nonnegative" CHECK (
    ("price" IS NULL OR "price" >= 0) AND
    ("compareAtPrice" IS NULL OR "compareAtPrice" >= 0) AND
    "makingChargeFixed" >= 0 AND "makingChargePerGram" >= 0 AND
    "makingChargePercent" BETWEEN 0 AND 100 AND "artisticFee" >= 0 AND
    ("profitPercent" IS NULL OR "profitPercent" BETWEEN 0 AND 100) AND
    ("taxPercent" IS NULL OR "taxPercent" BETWEEN 0 AND 100)
  ),
  CONSTRAINT "products_purity_range" CHECK (
    "purityFineness" IS NULL OR "purityFineness" BETWEEN 1 AND 1000
  )
);

CREATE TABLE "product_images" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "imageUrl" TEXT NOT NULL,
  "altFa" TEXT,
  "altEn" TEXT,
  "width" INTEGER,
  "height" INTEGER,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_variants" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "titleFa" TEXT NOT NULL,
  "titleEn" TEXT NOT NULL,
  "sku" TEXT,
  "price" DECIMAL(18,0),
  "stock" INTEGER NOT NULL DEFAULT 0,
  "goldWeight" DECIMAL(10,3),
  "purity" TEXT,
  "purityFineness" INTEGER,
  "makingChargeFixed" DECIMAL(18,0),
  "makingChargePerGram" DECIMAL(18,0),
  "makingChargePercent" DECIMAL(7,3),
  "artisticFee" DECIMAL(18,0),
  "attributes" JSONB,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "variants_stock_nonnegative" CHECK ("stock" >= 0),
  CONSTRAINT "variants_values_nonnegative" CHECK (
    ("price" IS NULL OR "price" >= 0) AND
    ("makingChargeFixed" IS NULL OR "makingChargeFixed" >= 0) AND
    ("makingChargePerGram" IS NULL OR "makingChargePerGram" >= 0) AND
    ("makingChargePercent" IS NULL OR "makingChargePercent" BETWEEN 0 AND 100) AND
    ("artisticFee" IS NULL OR "artisticFee" >= 0) AND
    ("purityFineness" IS NULL OR "purityFineness" BETWEEN 1 AND 1000)
  )
);

CREATE TABLE "pricing_policies" (
  "id" UUID NOT NULL,
  "material" "MaterialType" NOT NULL,
  "referencePurity" INTEGER NOT NULL,
  "defaultProfitPercent" DECIMAL(7,3) NOT NULL DEFAULT 7,
  "defaultTaxPercent" DECIMAL(7,3) NOT NULL DEFAULT 10,
  "taxMetalValue" BOOLEAN NOT NULL DEFAULT false,
  "quoteTtlSeconds" INTEGER NOT NULL DEFAULT 120,
  "staleAfterMinutes" INTEGER NOT NULL DEFAULT 15,
  "closedMarketPricingEnabled" BOOLEAN NOT NULL DEFAULT true,
  "closedMarketMaxAgeMinutes" INTEGER NOT NULL DEFAULT 720,
  "closedMarketSafetyMarginPercent" DECIMAL(7,3) NOT NULL DEFAULT 2,
  "roundingStep" INTEGER NOT NULL DEFAULT 1,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pricing_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pricing_policy_ranges" CHECK (
    "referencePurity" BETWEEN 1 AND 1000 AND
    "defaultProfitPercent" BETWEEN 0 AND 100 AND
    "defaultTaxPercent" BETWEEN 0 AND 100 AND
    "quoteTtlSeconds" > 0 AND "staleAfterMinutes" > 0 AND
    "closedMarketMaxAgeMinutes" > 0 AND
    "closedMarketSafetyMarginPercent" BETWEEN 0 AND 100 AND
    "roundingStep" > 0
  )
);

CREATE TABLE "metal_prices" (
  "id" UUID NOT NULL,
  "material" "MaterialType" NOT NULL,
  "pricePerGram" DECIMAL(18,0) NOT NULL,
  "referencePurity" INTEGER NOT NULL DEFAULT 750,
  "currency" "Currency" NOT NULL DEFAULT 'TOMAN',
  "source" TEXT,
  "sourceSymbol" TEXT NOT NULL DEFAULT '',
  "sourceUnit" TEXT,
  "sourceDate" TEXT,
  "sourceTime" TEXT,
  "sourceTimeUnix" BIGINT,
  "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSuccessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "metal_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "metal_price_history" (
  "id" UUID NOT NULL,
  "metalPriceId" UUID NOT NULL,
  "material" "MaterialType" NOT NULL,
  "pricePerGram" DECIMAL(18,0) NOT NULL,
  "referencePurity" INTEGER NOT NULL,
  "currency" "Currency" NOT NULL DEFAULT 'TOMAN',
  "source" TEXT,
  "sourceSymbol" TEXT NOT NULL,
  "sourceUnit" TEXT,
  "sourceDate" TEXT,
  "sourceTime" TEXT,
  "sourceTimeUnix" BIGINT,
  "fetchedAt" TIMESTAMP(3) NOT NULL,
  "fingerprint" VARCHAR(64) NOT NULL,
  "rawPayload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "metal_price_history_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "orders" (
  "id" UUID NOT NULL,
  "orderNumber" VARCHAR(32) NOT NULL,
  "idempotencyKey" VARCHAR(128) NOT NULL,
  "locale" VARCHAR(10) NOT NULL DEFAULT 'fa',
  "currency" "Currency" NOT NULL DEFAULT 'TOMAN',
  "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
  "customerFullName" TEXT,
  "customerMobile" VARCHAR(20),
  "customerEmail" TEXT,
  "province" TEXT,
  "city" TEXT,
  "postalCode" VARCHAR(20),
  "address" TEXT,
  "subtotalToman" DECIMAL(18,0) NOT NULL,
  "shippingToman" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "discountToman" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "payableToman" DECIMAL(18,0) NOT NULL,
  "pricingSnapshot" JSONB NOT NULL,
  "priceVerifiedAt" TIMESTAMP(3) NOT NULL,
  "priceExpiresAt" TIMESTAMP(3) NOT NULL,
  "inventoryReservedAt" TIMESTAMP(3) NOT NULL,
  "inventoryExpiresAt" TIMESTAMP(3) NOT NULL,
  "inventoryReleasedAt" TIMESTAMP(3),
  "inventoryCommittedAt" TIMESTAMP(3),
  "paidAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "expiredAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "orders_money_nonnegative" CHECK (
    "subtotalToman" >= 0 AND "shippingToman" >= 0 AND
    "discountToman" >= 0 AND "payableToman" >= 0
  ),
  CONSTRAINT "orders_total_consistency" CHECK (
    "payableToman" = GREATEST("subtotalToman" + "shippingToman" - "discountToman", 0)
  ),
  CONSTRAINT "orders_reservation_dates" CHECK (
    "priceExpiresAt" >= "priceVerifiedAt" AND
    "inventoryExpiresAt" >= "inventoryReservedAt"
  )
);

CREATE TABLE "order_items" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "productId" UUID,
  "variantId" UUID,
  "productSlug" TEXT NOT NULL,
  "productSku" TEXT,
  "productNameFa" TEXT NOT NULL,
  "productNameEn" TEXT NOT NULL,
  "variantTitleFa" TEXT,
  "variantTitleEn" TEXT,
  "variantSku" TEXT,
  "material" "MaterialType" NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPriceToman" DECIMAL(18,0) NOT NULL,
  "lineTotalToman" DECIMAL(18,0) NOT NULL,
  "metalValueToman" DECIMAL(18,0),
  "makingChargeToman" DECIMAL(18,0),
  "artisticFeeToman" DECIMAL(18,0),
  "profitToman" DECIMAL(18,0),
  "taxToman" DECIMAL(18,0),
  "originalMetalRateToman" DECIMAL(18,0),
  "effectiveMetalRateToman" DECIMAL(18,0),
  "metalRateMode" VARCHAR(32),
  "metalRateReason" VARCHAR(64),
  "safetyMarginPercent" DECIMAL(7,3),
  "safetyMarginToman" DECIMAL(18,0),
  "stockBeforeReservation" INTEGER NOT NULL,
  "stockAfterReservation" INTEGER NOT NULL,
  "pricingSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "order_items_positive_values" CHECK (
    "quantity" > 0 AND "unitPriceToman" >= 0 AND "lineTotalToman" >= 0 AND
    "lineTotalToman" = "unitPriceToman" * "quantity" AND
    "stockBeforeReservation" >= 0 AND "stockAfterReservation" >= 0
  )
);

CREATE TABLE "payment_attempts" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "provider" VARCHAR(50) NOT NULL,
  "status" "PaymentStatus" NOT NULL DEFAULT 'CREATED',
  "amountToman" DECIMAL(18,0) NOT NULL,
  "gatewayAuthority" VARCHAR(128),
  "gatewayReference" VARCHAR(128),
  "activeKey" VARCHAR(180),
  "requestPayload" JSONB,
  "responsePayload" JSONB,
  "callbackPayload" JSONB,
  "verificationPayload" JSONB,
  "errorCode" VARCHAR(100),
  "errorMessage" TEXT,
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "redirectedAt" TIMESTAMP(3),
  "callbackReceivedAt" TIMESTAMP(3),
  "verificationStartedAt" TIMESTAMP(3),
  "verificationLeaseExpiresAt" TIMESTAMP(3),
  "verifiedAt" TIMESTAMP(3),
  "failedAt" TIMESTAMP(3),
  "refundedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_amount_positive" CHECK ("amountToman" > 0)
);

CREATE TABLE "order_audit_events" (
  "id" UUID NOT NULL,
  "orderId" UUID NOT NULL,
  "actorType" "AuditActorType" NOT NULL DEFAULT 'SYSTEM',
  "eventType" VARCHAR(100) NOT NULL,
  "requestId" VARCHAR(128),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "order_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_sessions_sessionHash_key" ON "admin_sessions"("sessionHash");
CREATE INDEX "admin_sessions_expiresAt_idx" ON "admin_sessions"("expiresAt");
CREATE INDEX "admin_sessions_revokedAt_idx" ON "admin_sessions"("revokedAt");
CREATE INDEX "admin_security_events_eventType_createdAt_idx" ON "admin_security_events"("eventType", "createdAt");
CREATE INDEX "admin_security_events_successful_createdAt_idx" ON "admin_security_events"("successful", "createdAt");
CREATE INDEX "cron_leases_lockedUntil_idx" ON "cron_leases"("lockedUntil");
CREATE INDEX "rate_limit_buckets_resetAt_idx" ON "rate_limit_buckets"("resetAt");
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");
CREATE INDEX "collections_isActive_displayOrder_idx" ON "collections"("isActive", "displayOrder");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
CREATE INDEX "products_collectionId_status_displayOrder_idx" ON "products"("collectionId", "status", "displayOrder");
CREATE INDEX "products_material_status_idx" ON "products"("material", "status");
CREATE INDEX "products_pricingMode_status_idx" ON "products"("pricingMode", "status");
CREATE INDEX "products_isFeatured_status_idx" ON "products"("isFeatured", "status");
CREATE INDEX "product_images_productId_displayOrder_idx" ON "product_images"("productId", "displayOrder");
CREATE INDEX "product_images_productId_isPrimary_idx" ON "product_images"("productId", "isPrimary");
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE INDEX "product_variants_productId_isActive_displayOrder_idx" ON "product_variants"("productId", "isActive", "displayOrder");
CREATE UNIQUE INDEX "pricing_policies_material_key" ON "pricing_policies"("material");
CREATE INDEX "pricing_policies_material_isActive_idx" ON "pricing_policies"("material", "isActive");
CREATE UNIQUE INDEX "metal_prices_material_key" ON "metal_prices"("material");
CREATE INDEX "metal_prices_material_lastSuccessAt_idx" ON "metal_prices"("material", "lastSuccessAt");
CREATE INDEX "metal_prices_updatedAt_idx" ON "metal_prices"("updatedAt");
CREATE UNIQUE INDEX "metal_price_history_fingerprint_key" ON "metal_price_history"("fingerprint");
CREATE INDEX "metal_price_history_material_fetchedAt_idx" ON "metal_price_history"("material", "fetchedAt");
CREATE INDEX "metal_price_history_metalPriceId_fetchedAt_idx" ON "metal_price_history"("metalPriceId", "fetchedAt");
CREATE UNIQUE INDEX "orders_orderNumber_key" ON "orders"("orderNumber");
CREATE UNIQUE INDEX "orders_idempotencyKey_key" ON "orders"("idempotencyKey");
CREATE INDEX "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
CREATE INDEX "orders_customerMobile_createdAt_idx" ON "orders"("customerMobile", "createdAt");
CREATE INDEX "orders_priceExpiresAt_idx" ON "orders"("priceExpiresAt");
CREATE INDEX "orders_inventoryExpiresAt_idx" ON "orders"("inventoryExpiresAt");
CREATE INDEX "order_items_orderId_idx" ON "order_items"("orderId");
CREATE INDEX "order_items_productId_idx" ON "order_items"("productId");
CREATE INDEX "order_items_variantId_idx" ON "order_items"("variantId");
CREATE INDEX "order_items_material_idx" ON "order_items"("material");
CREATE UNIQUE INDEX "payment_attempts_gatewayAuthority_key" ON "payment_attempts"("gatewayAuthority");
CREATE UNIQUE INDEX "payment_attempts_gatewayReference_key" ON "payment_attempts"("gatewayReference");
CREATE UNIQUE INDEX "payment_attempts_activeKey_key" ON "payment_attempts"("activeKey");
CREATE INDEX "payment_attempts_orderId_status_idx" ON "payment_attempts"("orderId", "status");
CREATE INDEX "payment_attempts_status_createdAt_idx" ON "payment_attempts"("status", "createdAt");
CREATE INDEX "payment_attempts_provider_createdAt_idx" ON "payment_attempts"("provider", "createdAt");
CREATE INDEX "payment_attempts_verificationLeaseExpiresAt_idx" ON "payment_attempts"("verificationLeaseExpiresAt");
CREATE INDEX "order_audit_events_orderId_createdAt_idx" ON "order_audit_events"("orderId", "createdAt");
CREATE INDEX "order_audit_events_eventType_createdAt_idx" ON "order_audit_events"("eventType", "createdAt");

ALTER TABLE "products" ADD CONSTRAINT "products_collectionId_fkey"
  FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "metal_price_history" ADD CONSTRAINT "metal_price_history_metalPriceId_fkey"
  FOREIGN KEY ("metalPriceId") REFERENCES "metal_prices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_audit_events" ADD CONSTRAINT "order_audit_events_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
