ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "characterImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "worldSceneImageUrl" TEXT;
