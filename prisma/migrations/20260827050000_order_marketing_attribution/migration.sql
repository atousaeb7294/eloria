-- Nullable marketing attribution fields. This migration is additive and does not rewrite existing orders.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "marketingSource" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "marketingMedium" VARCHAR(120),
  ADD COLUMN IF NOT EXISTS "marketingCampaign" VARCHAR(160),
  ADD COLUMN IF NOT EXISTS "marketingContent" VARCHAR(160);

CREATE INDEX IF NOT EXISTS "orders_marketingSource_createdAt_idx"
  ON "orders"("marketingSource", "createdAt");
CREATE INDEX IF NOT EXISTS "orders_marketingCampaign_createdAt_idx"
  ON "orders"("marketingCampaign", "createdAt");
