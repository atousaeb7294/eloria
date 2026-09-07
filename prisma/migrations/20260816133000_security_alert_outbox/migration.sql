CREATE TABLE "security_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sourceEventId" UUID NOT NULL,
    "eventType" VARCHAR(100) NOT NULL,
    "severity" VARCHAR(16) NOT NULL,
    "scope" VARCHAR(32) NOT NULL,
    "channel" VARCHAR(16) NOT NULL,
    "status" VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    "dedupeKey" VARCHAR(64) NOT NULL,
    "payload" JSONB NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAttemptAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "lastError" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "security_alerts_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "security_alerts_sourceEventId_fkey"
      FOREIGN KEY ("sourceEventId")
      REFERENCES "admin_security_events"("id")
      ON DELETE CASCADE
      ON UPDATE CASCADE,
    CONSTRAINT "security_alerts_severity_check"
      CHECK ("severity" IN ('INFO', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT "security_alerts_channel_check"
      CHECK ("channel" IN ('SMS', 'WEBHOOK')),
    CONSTRAINT "security_alerts_status_check"
      CHECK ("status" IN ('PENDING', 'PROCESSING', 'SENT', 'FAILED')),
    CONSTRAINT "security_alerts_attempts_check"
      CHECK ("attempts" >= 0)
);

CREATE UNIQUE INDEX "security_alerts_dedupeKey_key"
  ON "security_alerts"("dedupeKey");

CREATE INDEX "security_alerts_status_nextAttemptAt_idx"
  ON "security_alerts"("status", "nextAttemptAt");

CREATE INDEX "security_alerts_severity_createdAt_idx"
  ON "security_alerts"("severity", "createdAt");

CREATE INDEX "security_alerts_sourceEventId_createdAt_idx"
  ON "security_alerts"("sourceEventId", "createdAt");
