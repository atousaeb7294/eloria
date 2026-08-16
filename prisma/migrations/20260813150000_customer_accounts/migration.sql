CREATE TABLE "customers" (
  "id" UUID NOT NULL,
  "fullName" TEXT NOT NULL,
  "mobile" VARCHAR(20) NOT NULL,
  "email" TEXT,
  "passwordHash" VARCHAR(255) NOT NULL,
  "mobileVerifiedAt" TIMESTAMP(3),
  "emailVerifiedAt" TIMESTAMP(3),
  "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  "lockedUntil" TIMESTAMP(3),
  "lastLoginAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_sessions" (
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

CREATE TABLE "customer_password_reset_challenges" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "requestedIpHash" VARCHAR(64),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_password_reset_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_addresses" (
  "id" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "title" TEXT NOT NULL,
  "recipientFullName" TEXT NOT NULL,
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

CREATE TABLE "customer_favorites" (
  "customerId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("customerId", "productId")
);

ALTER TABLE "orders" ADD COLUMN "customerId" UUID;

CREATE UNIQUE INDEX "customers_mobile_key" ON "customers"("mobile");
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");
CREATE INDEX "customers_isActive_createdAt_idx" ON "customers"("isActive", "createdAt");
CREATE INDEX "customers_lockedUntil_idx" ON "customers"("lockedUntil");
CREATE UNIQUE INDEX "customer_sessions_sessionHash_key" ON "customer_sessions"("sessionHash");
CREATE INDEX "customer_sessions_customerId_expiresAt_idx" ON "customer_sessions"("customerId", "expiresAt");
CREATE INDEX "customer_sessions_expiresAt_idx" ON "customer_sessions"("expiresAt");
CREATE INDEX "customer_sessions_revokedAt_idx" ON "customer_sessions"("revokedAt");
CREATE INDEX "customer_password_reset_challenges_customerId_expiresAt_idx" ON "customer_password_reset_challenges"("customerId", "expiresAt");
CREATE INDEX "customer_password_reset_challenges_expiresAt_idx" ON "customer_password_reset_challenges"("expiresAt");
CREATE INDEX "customer_addresses_customerId_isDefault_idx" ON "customer_addresses"("customerId", "isDefault");
CREATE INDEX "customer_favorites_productId_idx" ON "customer_favorites"("productId");
CREATE INDEX "orders_customerId_createdAt_idx" ON "orders"("customerId", "createdAt");

ALTER TABLE "customer_sessions"
  ADD CONSTRAINT "customer_sessions_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_addresses"
  ADD CONSTRAINT "customer_addresses_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_password_reset_challenges"
  ADD CONSTRAINT "customer_password_reset_challenges_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_favorites"
  ADD CONSTRAINT "customer_favorites_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_favorites"
  ADD CONSTRAINT "customer_favorites_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
