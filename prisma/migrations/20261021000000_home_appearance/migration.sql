CREATE TABLE "hero_cutouts" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "sourceImageId" UUID NOT NULL,
  "sourceImageUrl" TEXT NOT NULL,
  "sourceHash" VARCHAR(64) NOT NULL,
  "pipelineVersion" VARCHAR(80) NOT NULL,
  "bytes" BYTEA NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hero_cutouts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "hero_cutouts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "hero_cutouts_source_pipeline_key" ON "hero_cutouts"("productId", "sourceImageId", "sourceHash", "pipelineVersion");
CREATE TABLE "storefront_appearance" (
  "id" VARCHAR(40) NOT NULL DEFAULT 'home',
  "heroCutoutId" UUID,
  "heroScale" INTEGER NOT NULL DEFAULT 90,
  "featuredProductIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "featuredCutoutIds" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "storefront_appearance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "storefront_appearance_scale_check" CHECK ("heroScale" BETWEEN 60 AND 100),
  CONSTRAINT "storefront_appearance_heroCutoutId_fkey" FOREIGN KEY ("heroCutoutId") REFERENCES "hero_cutouts"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
