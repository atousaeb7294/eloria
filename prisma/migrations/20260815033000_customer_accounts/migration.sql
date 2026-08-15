-- ELORIA V3: real customer accounts, sessions, addresses, favorites and notifications.

CREATE TABLE IF NOT EXISTS "customers" (
    "id" UUID NOT NULL,
    "mobile" VARCHAR(20) NOT NULL,
    "fullName" TEXT,
    "email" TEXT,
    "mobileVerifiedAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customers_mobile_key" ON "customers"("mobile");
CREATE INDEX IF NOT EXISTS "customers_isActive_createdAt_idx" ON "customers"("isActive", "createdAt");

CREATE TABLE IF NOT EXISTS "customer_sessions" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "sessionHash" VARCHAR(64) NOT NULL,
    "ipHash" VARCHAR(64),
    "userAgent" VARCHAR(500),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "customer_sessions_sessionHash_key" ON "customer_sessions"("sessionHash");
CREATE INDEX IF NOT EXISTS "customer_sessions_customerId_expiresAt_idx" ON "customer_sessions"("customerId", "expiresAt");
CREATE INDEX IF NOT EXISTS "customer_sessions_revokedAt_idx" ON "customer_sessions"("revokedAt");

CREATE TABLE IF NOT EXISTS "customer_otp_challenges" (
    "id" UUID NOT NULL,
    "mobile" VARCHAR(20) NOT NULL,
    "codeHash" VARCHAR(64) NOT NULL,
    "purpose" VARCHAR(32) NOT NULL DEFAULT 'LOGIN',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "requestIpHash" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_otp_challenges_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_otp_challenges_mobile_createdAt_idx" ON "customer_otp_challenges"("mobile", "createdAt");
CREATE INDEX IF NOT EXISTS "customer_otp_challenges_expiresAt_idx" ON "customer_otp_challenges"("expiresAt");

CREATE TABLE IF NOT EXISTS "customer_addresses" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "title" VARCHAR(80) NOT NULL DEFAULT 'آدرس من',
    "recipientName" TEXT NOT NULL,
    "mobile" VARCHAR(20) NOT NULL,
    "province" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "postalCode" VARCHAR(20) NOT NULL,
    "address" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_addresses_customerId_isDefault_idx" ON "customer_addresses"("customerId", "isDefault");

CREATE TABLE IF NOT EXISTS "customer_favorites" (
    "customerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("customerId", "productId")
);

CREATE INDEX IF NOT EXISTS "customer_favorites_productId_idx" ON "customer_favorites"("productId");

CREATE TABLE IF NOT EXISTS "customer_notifications" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "titleFa" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "bodyFa" TEXT NOT NULL,
    "bodyEn" TEXT NOT NULL,
    "orderId" UUID,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "customer_notifications_customerId_createdAt_idx" ON "customer_notifications"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "customer_notifications_customerId_readAt_idx" ON "customer_notifications"("customerId", "readAt");

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "customerId" UUID;
CREATE INDEX IF NOT EXISTS "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "customer_sessions"
    ADD CONSTRAINT "customer_sessions_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "customer_addresses"
    ADD CONSTRAINT "customer_addresses_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "customer_favorites"
    ADD CONSTRAINT "customer_favorites_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "customer_favorites"
    ADD CONSTRAINT "customer_favorites_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "customer_notifications"
    ADD CONSTRAINT "customer_notifications_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "orders"
    ADD CONSTRAINT "orders_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
