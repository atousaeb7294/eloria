-- ELORIA_CONTENT_STUDIO_AND_SEO_HEALTH_V1
-- A reviewed editorial workflow, factual draft provenance, and daily SEO
-- health snapshots. Public readers can never see drafts or archived copy.

DO $$ BEGIN
  CREATE TYPE "ContentArticleStatus" AS ENUM (
    'DRAFT',
    'IN_REVIEW',
    'PUBLISHED',
    'ARCHIVED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ContentArticleOrigin" AS ENUM (
    'MANUAL',
    'PRODUCT_ASSISTED'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "content_articles" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slug" VARCHAR(140) NOT NULL,
  "status" "ContentArticleStatus" NOT NULL DEFAULT 'DRAFT',
  "origin" "ContentArticleOrigin" NOT NULL DEFAULT 'MANUAL',
  "sourceProductId" UUID,
  "sourceCollectionId" UUID,
  "titleFa" VARCHAR(180) NOT NULL,
  "titleEn" VARCHAR(180) NOT NULL,
  "excerptFa" VARCHAR(360) NOT NULL,
  "excerptEn" VARCHAR(360) NOT NULL,
  "contentFa" TEXT NOT NULL,
  "contentEn" TEXT NOT NULL,
  "seoTitleFa" VARCHAR(180),
  "seoTitleEn" VARCHAR(180),
  "seoDescriptionFa" VARCHAR(180),
  "seoDescriptionEn" VARCHAR(180),
  "focusKeywordFa" VARCHAR(120),
  "focusKeywordEn" VARCHAR(120),
  "coverImageUrl" TEXT,
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "content_articles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_articles_slug_key" UNIQUE ("slug"),
  CONSTRAINT "content_articles_published_requires_date"
    CHECK (
      "status" <> 'PUBLISHED' OR
      "publishedAt" IS NOT NULL
    ),
  CONSTRAINT "content_articles_title_fa_nonempty"
    CHECK (length(BTRIM("titleFa")) >= 8),
  CONSTRAINT "content_articles_title_en_nonempty"
    CHECK (length(BTRIM("titleEn")) >= 8),
  CONSTRAINT "content_articles_content_fa_nonempty"
    CHECK (length(BTRIM("contentFa")) >= 80),
  CONSTRAINT "content_articles_content_en_nonempty"
    CHECK (length(BTRIM("contentEn")) >= 80)
);

DO $$ BEGIN
  ALTER TABLE "content_articles"
    ADD CONSTRAINT "content_articles_sourceProductId_fkey"
    FOREIGN KEY ("sourceProductId")
    REFERENCES "products"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "content_articles"
    ADD CONSTRAINT "content_articles_sourceCollectionId_fkey"
    FOREIGN KEY ("sourceCollectionId")
    REFERENCES "collections"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS
  "content_articles_status_publishedAt_idx"
  ON "content_articles"("status", "publishedAt");
CREATE INDEX IF NOT EXISTS
  "content_articles_updatedAt_idx"
  ON "content_articles"("updatedAt");
CREATE INDEX IF NOT EXISTS
  "content_articles_sourceProductId_idx"
  ON "content_articles"("sourceProductId");
CREATE INDEX IF NOT EXISTS
  "content_articles_sourceCollectionId_idx"
  ON "content_articles"("sourceCollectionId");
CREATE UNIQUE INDEX IF NOT EXISTS
  "content_articles_one_live_source_product_idx"
  ON "content_articles"("sourceProductId")
  WHERE "sourceProductId" IS NOT NULL
    AND "status" <> 'ARCHIVED';

CREATE TABLE IF NOT EXISTS "content_article_audit_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "articleId" UUID NOT NULL,
  "eventType" VARCHAR(80) NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "content_article_audit_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_article_audit_events_articleId_fkey"
    FOREIGN KEY ("articleId")
    REFERENCES "content_articles"("id")
    ON DELETE RESTRICT
    ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS
  "content_article_audit_events_articleId_createdAt_idx"
  ON "content_article_audit_events"("articleId", "createdAt");
CREATE INDEX IF NOT EXISTS
  "content_article_audit_events_eventType_createdAt_idx"
  ON "content_article_audit_events"("eventType", "createdAt");

CREATE TABLE IF NOT EXISTS "content_seo_snapshots" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recordedFor" DATE NOT NULL,
  "overallScore" INTEGER NOT NULL,
  "publishedArticleCount" INTEGER NOT NULL,
  "draftArticleCount" INTEGER NOT NULL,
  "activeProductCount" INTEGER NOT NULL,
  "productsMissingDescription" INTEGER NOT NULL,
  "productsMissingImageAlt" INTEGER NOT NULL,
  "stalePublishedArticleCount" INTEGER NOT NULL,
  "issues" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "content_seo_snapshots_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "content_seo_snapshots_recordedFor_key" UNIQUE ("recordedFor"),
  CONSTRAINT "content_seo_snapshots_score_range"
    CHECK ("overallScore" >= 0 AND "overallScore" <= 100),
  CONSTRAINT "content_seo_snapshots_counts_nonnegative"
    CHECK (
      "publishedArticleCount" >= 0 AND
      "draftArticleCount" >= 0 AND
      "activeProductCount" >= 0 AND
      "productsMissingDescription" >= 0 AND
      "productsMissingImageAlt" >= 0 AND
      "stalePublishedArticleCount" >= 0
    )
);

CREATE INDEX IF NOT EXISTS
  "content_seo_snapshots_createdAt_idx"
  ON "content_seo_snapshots"("createdAt");

-- Editorial entries themselves remain editable, but their audit evidence and
-- historic health measurements are database-enforced append-only records.
CREATE OR REPLACE FUNCTION eloria_content_audit_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Content article audit events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS
  "content_article_audit_events_append_only"
  ON "content_article_audit_events";

CREATE TRIGGER "content_article_audit_events_append_only"
BEFORE UPDATE OR DELETE
ON "content_article_audit_events"
FOR EACH ROW
EXECUTE FUNCTION eloria_content_audit_append_only();

CREATE OR REPLACE FUNCTION eloria_content_snapshot_append_only()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Content SEO snapshots are append-only';
END;
$$;

DROP TRIGGER IF EXISTS
  "content_seo_snapshots_append_only"
  ON "content_seo_snapshots";

CREATE TRIGGER "content_seo_snapshots_append_only"
BEFORE UPDATE OR DELETE
ON "content_seo_snapshots"
FOR EACH ROW
EXECUTE FUNCTION eloria_content_snapshot_append_only();
