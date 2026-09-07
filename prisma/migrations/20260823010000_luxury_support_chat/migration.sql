-- ELORIA_LUXURY_SUPPORT_CHAT_V1
-- A database-backed support inbox with opaque visitor tokens. No order,
-- payment, pricing, intro, background, logo, or font record is modified.

DO $$ BEGIN
  CREATE TYPE "SupportConversationStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupportMessageAuthor" AS ENUM ('VISITOR', 'ADMIN');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "support_conversations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "accessTokenHash" VARCHAR(64) NOT NULL,
  "customerId" UUID,
  "locale" VARCHAR(10) NOT NULL DEFAULT 'fa',
  "visitorName" VARCHAR(120),
  "visitorEmail" VARCHAR(254),
  "visitorPhone" VARCHAR(30),
  "status" "SupportConversationStatus" NOT NULL DEFAULT 'OPEN',
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_conversations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_conversations_accessTokenHash_key" UNIQUE ("accessTokenHash"),
  CONSTRAINT "support_conversations_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "customers"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "support_conversations_status_lastMessageAt_idx"
  ON "support_conversations"("status", "lastMessageAt");
CREATE INDEX IF NOT EXISTS "support_conversations_customerId_createdAt_idx"
  ON "support_conversations"("customerId", "createdAt");

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "conversationId" UUID NOT NULL,
  "author" "SupportMessageAuthor" NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "support_messages_conversationId_fkey"
    FOREIGN KEY ("conversationId") REFERENCES "support_conversations"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "support_messages_conversationId_createdAt_idx"
  ON "support_messages"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "support_messages_author_readAt_idx"
  ON "support_messages"("author", "readAt");

CREATE TABLE IF NOT EXISTS "support_agent_presence" (
  "id" VARCHAR(32) NOT NULL DEFAULT 'primary',
  "lastSeenAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "support_agent_presence_pkey" PRIMARY KEY ("id")
);
