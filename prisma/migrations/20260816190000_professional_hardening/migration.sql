-- ELORIA_PROFESSIONAL_HARDENING_V1
-- Generated for audited base commit:
-- 2f7820c9ed29a25fccb5672ba1abb6ee706a54ae

-- 1) Refund auditability: a payment cannot be marked refunded without
-- a durable bank/provider reference and amount.
ALTER TABLE "payment_attempts"
  ADD COLUMN IF NOT EXISTS "refundReference" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "refundAmountToman" DECIMAL(18,0),
  ADD COLUMN IF NOT EXISTS "refundNote" TEXT;

-- Preserve any legacy REFUNDED rows while making the missing provenance explicit.
UPDATE "payment_attempts"
SET
  "refundReference" = COALESCE(
    "refundReference",
    'LEGACY-MIGRATION-' || "id"::text
  ),
  "refundAmountToman" = COALESCE(
    "refundAmountToman",
    "amountToman"
  ),
  "refundNote" = COALESCE(
    "refundNote",
    'Backfilled by 20260816190000_professional_hardening; verify legacy refund externally.'
  )
WHERE "status" = 'REFUNDED';

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_refund_amount_positive'
  ) THEN
    ALTER TABLE "payment_attempts"
      ADD CONSTRAINT "payment_refund_amount_positive"
      CHECK (
        "refundAmountToman" IS NULL OR
        "refundAmountToman" > 0
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'payment_refunded_requires_reference'
  ) THEN
    ALTER TABLE "payment_attempts"
      ADD CONSTRAINT "payment_refunded_requires_reference"
      CHECK (
        "status" <> 'REFUNDED' OR
        (
          "refundReference" IS NOT NULL AND
          length(trim("refundReference")) >= 6 AND
          "refundAmountToman" IS NOT NULL AND
          "refundAmountToman" > 0
        )
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS
  "payment_attempts_refundReference_idx"
  ON "payment_attempts"("refundReference");

-- 2) CustomerNotification.orderId becomes an actual nullable FK.
UPDATE "customer_notifications" AS n
SET "orderId" = NULL
WHERE "orderId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "orders" AS o
    WHERE o."id" = n."orderId"
  );

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customer_notifications_orderId_fkey'
  ) THEN
    ALTER TABLE "customer_notifications"
      ADD CONSTRAINT "customer_notifications_orderId_fkey"
      FOREIGN KEY ("orderId")
      REFERENCES "orders"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS
  "customer_notifications_orderId_idx"
  ON "customer_notifications"("orderId");

-- 3) Database-level guarantee: at most one default address per customer.
WITH ranked_defaults AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "customerId"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id"
    ) AS rn
  FROM "customer_addresses"
  WHERE "isDefault" = TRUE
)
UPDATE "customer_addresses" AS a
SET "isDefault" = FALSE
FROM ranked_defaults AS r
WHERE a."id" = r."id"
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS
  "customer_addresses_one_default_per_customer_idx"
  ON "customer_addresses"("customerId")
  WHERE "isDefault" = TRUE;

-- 4) Shipment is first-class structured operational data, while
-- OrderAuditEvent remains the immutable history.
CREATE TABLE IF NOT EXISTS "shipments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "orderId" UUID NOT NULL,
  "carrier" VARCHAR(120) NOT NULL,
  "trackingCode" VARCHAR(160) NOT NULL,
  "status" VARCHAR(40) NOT NULL DEFAULT 'PROCESSING',
  "note" TEXT,
  "shippedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "shipments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "shipments_orderId_fkey"
    FOREIGN KEY ("orderId")
    REFERENCES "orders"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS
  "shipments_orderId_createdAt_idx"
  ON "shipments"("orderId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS
  "shipments_orderId_carrier_trackingCode_key"
  ON "shipments"("orderId", "carrier", "trackingCode");

-- Backfill structured shipment rows from legacy audit payloads when possible.
INSERT INTO "shipments" (
  "id",
  "orderId",
  "carrier",
  "trackingCode",
  "status",
  "note",
  "shippedAt",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid(),
  e."orderId",
  left(trim(e."payload"->>'carrier'), 120),
  left(trim(e."payload"->>'trackingCode'), 160),
  CASE
    WHEN o."status"::text IN ('PROCESSING', 'SHIPPED', 'COMPLETED')
      THEN o."status"::text
    ELSE 'PROCESSING'
  END,
  NULLIF(e."payload"->>'note', ''),
  CASE
    WHEN o."status"::text IN ('SHIPPED', 'COMPLETED') THEN e."createdAt"
    ELSE NULL
  END,
  e."createdAt",
  e."createdAt"
FROM "order_audit_events" AS e
JOIN "orders" AS o ON o."id" = e."orderId"
WHERE e."eventType" = 'SHIPMENT_DETAILS_UPDATED'
  AND jsonb_typeof(e."payload") = 'object'
  AND NULLIF(trim(e."payload"->>'carrier'), '') IS NOT NULL
  AND NULLIF(trim(e."payload"->>'trackingCode'), '') IS NOT NULL
ON CONFLICT ("orderId", "carrier", "trackingCode") DO NOTHING;
