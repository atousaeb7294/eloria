-- ELORIA: customer password authentication and account recovery.
-- Additive and safe for both the current OTP schema and older customer schemas.

ALTER TABLE "customers"
  ADD COLUMN IF NOT EXISTS "passwordHash" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "customers_lockedUntil_idx"
  ON "customers"("lockedUntil");

