-- ELORIA V3: legacy customer_addresses compatibility.
-- Non-destructive migration:
--   * preserves existing address rows
--   * renames legacy recipientFullName -> recipientName when possible
--   * safely backfills if both columns somehow exist
--   * does not drop customer/address data

DO $$
DECLARE
  has_new BOOLEAN;
  has_legacy BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customer_addresses'
      AND column_name = 'recipientName'
  ) INTO has_new;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customer_addresses'
      AND column_name = 'recipientFullName'
  ) INTO has_legacy;

  IF NOT has_new AND has_legacy THEN
    ALTER TABLE "customer_addresses"
      RENAME COLUMN "recipientFullName" TO "recipientName";

  ELSIF has_new AND has_legacy THEN
    UPDATE "customer_addresses"
    SET "recipientName" = COALESCE(
      NULLIF(BTRIM("recipientName"), ''),
      "recipientFullName"
    )
    WHERE "recipientName" IS NULL
       OR BTRIM("recipientName") = '';

    -- Keep the legacy column for compatibility, but it must not block new V3 writes.
    ALTER TABLE "customer_addresses"
      ALTER COLUMN "recipientFullName" DROP NOT NULL;

  ELSIF NOT has_new AND NOT has_legacy THEN
    -- Defensive path for an unexpected older schema.
    ALTER TABLE "customer_addresses"
      ADD COLUMN "recipientName" TEXT;

    UPDATE "customer_addresses" a
    SET "recipientName" = COALESCE(
      NULLIF(BTRIM(c."fullName"), ''),
      'مشتری'
    )
    FROM "customers" c
    WHERE c."id" = a."customerId"
      AND a."recipientName" IS NULL;

    UPDATE "customer_addresses"
    SET "recipientName" = 'مشتری'
    WHERE "recipientName" IS NULL;

    ALTER TABLE "customer_addresses"
      ALTER COLUMN "recipientName" SET NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'customer_addresses'
      AND column_name = 'recipientName'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM "customer_addresses"
      WHERE "recipientName" IS NULL
         OR BTRIM("recipientName") = ''
    ) THEN
      RAISE EXCEPTION 'customer_addresses.recipientName contains empty legacy rows; manual review required';
    END IF;

    ALTER TABLE "customer_addresses"
      ALTER COLUMN "recipientName" SET NOT NULL;
  ELSE
    RAISE EXCEPTION 'customer_addresses.recipientName was not created';
  END IF;
END $$;
