ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "mythKey" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_mythKey_key"
ON "products"("mythKey");
