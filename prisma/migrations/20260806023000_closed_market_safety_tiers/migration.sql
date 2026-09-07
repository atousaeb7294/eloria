ALTER TABLE "pricing_policies"
  ALTER COLUMN "closedMarketMaxAgeMinutes" SET DEFAULT 5760,
  ALTER COLUMN "closedMarketSafetyMarginPercent" SET DEFAULT 3;

UPDATE "pricing_policies"
SET
  "closedMarketPricingEnabled" = true,
  "closedMarketMaxAgeMinutes" = 5760,
  "closedMarketSafetyMarginPercent" = CASE
    WHEN "material" = 'GOLD' THEN 3
    WHEN "material" = 'SILVER' THEN 5
    ELSE "closedMarketSafetyMarginPercent"
  END,
  "updatedAt" = NOW()
WHERE "material" IN ('GOLD', 'SILVER');
