-- Multi-metal products remain compatible with the existing primary material fields.
ALTER TABLE "products"
  ADD COLUMN "hasGold" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "hasSilver" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "goldComponentWeight" DECIMAL(10,3),
  ADD COLUMN "silverComponentWeight" DECIMAL(10,3);

UPDATE "products"
SET
  "hasGold" = ("material" = 'GOLD'),
  "hasSilver" = ("material" = 'SILVER'),
  "goldComponentWeight" = CASE WHEN "material" = 'GOLD' THEN "goldWeight" ELSE NULL END,
  "silverComponentWeight" = CASE WHEN "material" = 'SILVER' THEN "goldWeight" ELSE NULL END;

CREATE INDEX "products_hasGold_status_idx" ON "products"("hasGold", "status");
CREATE INDEX "products_hasSilver_status_idx" ON "products"("hasSilver", "status");
