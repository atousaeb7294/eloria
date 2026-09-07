-- ELORIA_SMART_OPERATIONS_V1
-- Consent-first performance and funnel telemetry, plus in-account product watches.
-- No existing customer, product, or financial record is rewritten by this migration.

CREATE TABLE IF NOT EXISTS "customer_product_watches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "customerId" UUID NOT NULL,
  "productId" UUID NOT NULL,
  "notifyOnPriceDrop" BOOLEAN NOT NULL DEFAULT TRUE,
  "notifyOnRestock" BOOLEAN NOT NULL DEFAULT TRUE,
  "lastObservedPriceToman" DECIMAL(18,0),
  "lastObservedInStock" BOOLEAN,
  "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "customer_product_watches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_product_watches_customerId_productId_key" UNIQUE ("customerId", "productId"),
  CONSTRAINT "customer_product_watches_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "customer_product_watches_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "customer_product_watches_productId_updatedAt_idx"
  ON "customer_product_watches"("productId", "updatedAt");
CREATE INDEX IF NOT EXISTS "customer_product_watches_customerId_createdAt_idx"
  ON "customer_product_watches"("customerId", "createdAt");

CREATE TABLE IF NOT EXISTS "site_measurement_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "eventKey" VARCHAR(160) NOT NULL,
  "eventType" VARCHAR(40) NOT NULL,
  "locale" VARCHAR(10) NOT NULL,
  "path" VARCHAR(240) NOT NULL,
  "sessionId" VARCHAR(80) NOT NULL,
  "productSlug" VARCHAR(140),
  "metricName" VARCHAR(32),
  "metricValue" DECIMAL(18,4),
  "metricRating" VARCHAR(24),
  "navigationType" VARCHAR(32),
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "site_measurement_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "site_measurement_events_eventKey_key" UNIQUE ("eventKey"),
  CONSTRAINT "site_measurement_events_event_type_check"
    CHECK ("eventType" IN ('page_view', 'view_item', 'view_cart', 'begin_checkout', 'add_to_cart', 'web_vital')),
  CONSTRAINT "site_measurement_events_locale_check"
    CHECK ("locale" IN ('fa', 'en')),
  CONSTRAINT "site_measurement_events_path_check"
    CHECK (left("path", 1) = '/' AND position('?' IN "path") = 0 AND position('#' IN "path") = 0),
  CONSTRAINT "site_measurement_events_vital_shape_check"
    CHECK (
      ("eventType" = 'web_vital' AND "metricName" IS NOT NULL AND "metricValue" IS NOT NULL)
      OR
      ("eventType" <> 'web_vital' AND "metricName" IS NULL AND "metricValue" IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS "site_measurement_events_eventType_occurredAt_idx"
  ON "site_measurement_events"("eventType", "occurredAt");
CREATE INDEX IF NOT EXISTS "site_measurement_events_path_occurredAt_idx"
  ON "site_measurement_events"("path", "occurredAt");
CREATE INDEX IF NOT EXISTS "site_measurement_events_productSlug_occurredAt_idx"
  ON "site_measurement_events"("productSlug", "occurredAt");
CREATE INDEX IF NOT EXISTS "site_measurement_events_metricName_occurredAt_idx"
  ON "site_measurement_events"("metricName", "occurredAt");
