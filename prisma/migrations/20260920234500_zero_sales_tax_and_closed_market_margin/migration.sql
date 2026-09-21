-- ELORIA pricing policy: no sales tax and no closed-market uplift.
-- Historical order snapshots remain unchanged for auditability.
ALTER TABLE "pricing_policies"
  ALTER COLUMN "defaultTaxPercent" SET DEFAULT 0,
  ALTER COLUMN "closedMarketSafetyMarginPercent" SET DEFAULT 0;

UPDATE "pricing_policies"
SET
  "defaultTaxPercent" = 0,
  "closedMarketSafetyMarginPercent" = 0,
  "updatedAt" = CURRENT_TIMESTAMP;

UPDATE "products"
SET
  "taxPercent" = 0,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "taxPercent" IS DISTINCT FROM 0;
