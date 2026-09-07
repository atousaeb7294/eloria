-- ELORIA_FINANCE_EXPENSE_LEDGER_V1
-- Immutable-by-default external-cost ledger for the protected finance panel.

DO $$ BEGIN
  CREATE TYPE "FinanceExpenseCategory" AS ENUM (
    'INVENTORY_PURCHASE',
    'SHIPPING_COST',
    'MARKETING',
    'RENT',
    'PAYROLL',
    'GATEWAY_FEE',
    'PACKAGING',
    'TAX',
    'SOFTWARE',
    'OTHER'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FinanceExpenseStatus" AS ENUM (
    'POSTED',
    'VOID'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "finance_expenses" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "documentNumber" VARCHAR(32) NOT NULL,
  "status" "FinanceExpenseStatus" NOT NULL DEFAULT 'POSTED',
  "category" "FinanceExpenseCategory" NOT NULL,
  "amountToman" DECIMAL(18,0) NOT NULL,
  "taxToman" DECIMAL(18,0) NOT NULL DEFAULT 0,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "supplier" VARCHAR(160) NOT NULL,
  "reference" VARCHAR(160) NOT NULL,
  "note" TEXT,
  "voidedAt" TIMESTAMP(3),
  "voidReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "finance_expenses_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "finance_expenses_documentNumber_key" UNIQUE ("documentNumber"),
  CONSTRAINT "finance_expenses_amount_positive"
    CHECK ("amountToman" > 0),
  CONSTRAINT "finance_expenses_tax_nonnegative"
    CHECK ("taxToman" >= 0),
  CONSTRAINT "finance_expenses_void_requires_reason"
    CHECK (
      "status" <> 'VOID' OR
      (
        "voidedAt" IS NOT NULL AND
        "voidReason" IS NOT NULL AND
        length(trim("voidReason")) >= 5
      )
    )
);

CREATE TABLE IF NOT EXISTS "finance_expense_audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "expenseId" UUID NOT NULL,
  "eventType" VARCHAR(80) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "finance_expense_audit_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "finance_expense_audit_events_expenseId_fkey"
    FOREIGN KEY ("expenseId")
    REFERENCES "finance_expenses"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS
  "finance_expenses_status_occurredAt_idx"
  ON "finance_expenses"("status", "occurredAt");

CREATE INDEX IF NOT EXISTS
  "finance_expenses_category_occurredAt_idx"
  ON "finance_expenses"("category", "occurredAt");

CREATE INDEX IF NOT EXISTS
  "finance_expenses_reference_idx"
  ON "finance_expenses"("reference");

CREATE INDEX IF NOT EXISTS
  "finance_expense_audit_events_expenseId_createdAt_idx"
  ON "finance_expense_audit_events"("expenseId", "createdAt");

CREATE INDEX IF NOT EXISTS
  "finance_expense_audit_events_eventType_createdAt_idx"
  ON "finance_expense_audit_events"("eventType", "createdAt");

-- The application deliberately has no edit or delete path for ledger rows.
-- Enforce that rule in PostgreSQL as well, so a later UI change cannot silently
-- remove audit evidence. A posted expense may transition exactly once to VOID.
CREATE OR REPLACE FUNCTION eloria_finance_expense_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Finance expenses cannot be deleted';
  END IF;

  IF OLD."status" <> 'POSTED'::"FinanceExpenseStatus" THEN
    RAISE EXCEPTION 'A voided finance expense cannot be changed';
  END IF;

  IF NEW."status" <> 'VOID'::"FinanceExpenseStatus"
    OR NEW."documentNumber" IS DISTINCT FROM OLD."documentNumber"
    OR NEW."category" IS DISTINCT FROM OLD."category"
    OR NEW."amountToman" IS DISTINCT FROM OLD."amountToman"
    OR NEW."taxToman" IS DISTINCT FROM OLD."taxToman"
    OR NEW."occurredAt" IS DISTINCT FROM OLD."occurredAt"
    OR NEW."supplier" IS DISTINCT FROM OLD."supplier"
    OR NEW."reference" IS DISTINCT FROM OLD."reference"
    OR NEW."note" IS DISTINCT FROM OLD."note"
    OR NEW."voidedAt" IS NULL
    OR NEW."voidReason" IS NULL
    OR length(trim(NEW."voidReason")) < 5
  THEN
    RAISE EXCEPTION 'Finance expenses are immutable; create a void event instead';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS
  "finance_expenses_immutable_guard"
  ON "finance_expenses";

CREATE TRIGGER "finance_expenses_immutable_guard"
BEFORE UPDATE OR DELETE
ON "finance_expenses"
FOR EACH ROW
EXECUTE FUNCTION eloria_finance_expense_guard();

CREATE OR REPLACE FUNCTION eloria_finance_expense_audit_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Finance audit events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS
  "finance_expense_audit_events_append_only"
  ON "finance_expense_audit_events";

CREATE TRIGGER "finance_expense_audit_events_append_only"
BEFORE UPDATE OR DELETE
ON "finance_expense_audit_events"
FOR EACH ROW
EXECUTE FUNCTION eloria_finance_expense_audit_append_only();
