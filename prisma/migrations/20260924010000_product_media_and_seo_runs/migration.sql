CREATE TABLE "product_media_assets" (
  "id" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "contentType" TEXT NOT NULL,
  "bytes" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_media_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_media_assets_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "product_media_assets_type_check" CHECK ("contentType" IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT "product_media_assets_size_check" CHECK (octet_length("bytes") BETWEEN 1 AND 8388608)
);
CREATE INDEX "product_media_assets_productId_idx" ON "product_media_assets"("productId");

CREATE TABLE "seo_automation_runs" (
  "id" UUID NOT NULL,
  "report" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "seo_automation_runs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "seo_automation_runs_createdAt_id_idx" ON "seo_automation_runs"("createdAt", "id");
CREATE FUNCTION eloria_seo_run_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'SEO automation runs are append-only';
END;
$$;
CREATE TRIGGER "seo_automation_runs_append_only"
BEFORE UPDATE OR DELETE ON "seo_automation_runs"
FOR EACH ROW EXECUTE FUNCTION eloria_seo_run_append_only();
