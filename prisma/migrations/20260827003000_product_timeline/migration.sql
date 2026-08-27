CREATE TABLE "product_timeline_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "productId" UUID NOT NULL,
  "eventType" VARCHAR(80) NOT NULL,
  "actorType" VARCHAR(40) NOT NULL DEFAULT 'SYSTEM',
  "actorLabel" VARCHAR(160),
  "titleFa" VARCHAR(240) NOT NULL,
  "details" JSONB,
  "metalWeight" DECIMAL(10,3),
  "priceToman" DECIMAL(18,0),
  "stock" INTEGER,
  "orderId" UUID,
  "invoiceReference" VARCHAR(180),
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "product_timeline_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "product_timeline_events_productId_fkey"
    FOREIGN KEY ("productId") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "product_timeline_events_productId_occurredAt_idx"
  ON "product_timeline_events"("productId", "occurredAt");
CREATE INDEX "product_timeline_events_eventType_occurredAt_idx"
  ON "product_timeline_events"("eventType", "occurredAt");
CREATE INDEX "product_timeline_events_orderId_idx"
  ON "product_timeline_events"("orderId");
