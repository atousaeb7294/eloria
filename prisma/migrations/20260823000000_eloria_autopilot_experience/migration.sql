-- ELORIA_AUTOPILOT_EXPERIENCE_V1
-- This table stores a single factual operational brief for each Tehran day.
-- It never contains customer contact details, payment tokens, or secrets.

CREATE TABLE IF NOT EXISTS "daily_store_briefings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recordedFor" DATE NOT NULL,
  "actionCount" INTEGER NOT NULL,
  "highPriorityCount" INTEGER NOT NULL,
  "summary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "daily_store_briefings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "daily_store_briefings_recordedFor_key" UNIQUE ("recordedFor"),
  CONSTRAINT "daily_store_briefings_counts_nonnegative"
    CHECK ("actionCount" >= 0 AND "highPriorityCount" >= 0)
);

CREATE INDEX IF NOT EXISTS "daily_store_briefings_createdAt_idx"
  ON "daily_store_briefings"("createdAt");
