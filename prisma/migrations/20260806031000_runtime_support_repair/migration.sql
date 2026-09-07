-- Idempotent repair for existing installations whose database predates the
-- runtime hardening migration or whose migration history was baselined later.

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
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rate_limit_count_nonnegative'
  ) THEN
    ALTER TABLE "rate_limit_buckets"
      ADD CONSTRAINT "rate_limit_count_nonnegative" CHECK ("count" >= 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "cron_leases" (
  "key" VARCHAR(100) PRIMARY KEY,
  "holder" VARCHAR(128) NOT NULL,
  "lockedUntil" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "cron_leases_lockedUntil_idx"
  ON "cron_leases"("lockedUntil");

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
CREATE INDEX IF NOT EXISTS "admin_sessions_expiresAt_idx"
  ON "admin_sessions"("expiresAt");
CREATE INDEX IF NOT EXISTS "admin_sessions_revokedAt_idx"
  ON "admin_sessions"("revokedAt");

CREATE TABLE IF NOT EXISTS "admin_security_events" (
  "id" UUID PRIMARY KEY,
  "eventType" VARCHAR(100) NOT NULL,
  "successful" BOOLEAN NOT NULL,
  "ipHash" VARCHAR(64),
  "userAgent" VARCHAR(500),
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "admin_security_events_eventType_createdAt_idx"
  ON "admin_security_events"("eventType", "createdAt");
CREATE INDEX IF NOT EXISTS "admin_security_events_successful_createdAt_idx"
  ON "admin_security_events"("successful", "createdAt");
