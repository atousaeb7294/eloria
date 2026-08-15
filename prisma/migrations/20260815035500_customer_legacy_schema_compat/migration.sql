-- ELORIA V3 legacy customer-table compatibility hotfix.
-- Safe/non-destructive:
-- - preserves legacy columns and data
-- - only relaxes constraints that conflict with OTP-only customer accounts
-- - no-op on a fresh V3 database where legacy columns do not exist

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'fullName'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "customers"
      ALTER COLUMN "fullName" DROP NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customers'
      AND column_name = 'passwordHash'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE "customers"
      ALTER COLUMN "passwordHash" DROP NOT NULL;
  END IF;
END $$;

-- Guardrail: the OTP-only V3 account flow must be able to create a customer
-- without a password or profile name. Extra legacy columns are intentionally kept.
