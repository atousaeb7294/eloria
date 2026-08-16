/* ELORIA_SECURITY_ALERT_OUTBOX_V1 */
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  normalizeSecuritySeverity,
  sanitizeSecurityPayload,
  securityFingerprint,
  securitySeverityRank,
  type SecurityAlertChannel,
  type SecurityJson,
  type SecurityScope,
  type SecuritySeverity,
} from "@/lib/security/security-event-policy";

export type SecurityEventInput = {
  eventType: string;
  severity: SecuritySeverity;
  scope: SecurityScope;
  successful?: boolean;
  ip?: string | null;
  userAgent?: string | null;
  subject?: string | null;
  details?: unknown;
  external?: boolean;
  dispatchKey?: string | null;
};

function json(value: SecurityJson): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function intEnv(name: string, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(process.env[name]?.trim() ?? "", 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, minimum), maximum);
}

function configuredChannels(): SecurityAlertChannel[] {
  const channels: SecurityAlertChannel[] = [];
  const mobile = process.env.ELORIA_SECURITY_ALERT_MOBILE?.trim() ?? "";
  const apiKey = process.env.KAVENEGAR_API_KEY?.trim() ?? "";
  if (/^09\d{9}$/.test(mobile) && apiKey.length >= 16) channels.push("SMS");

  const rawWebhook = process.env.ELORIA_SECURITY_ALERT_WEBHOOK_URL?.trim() ?? "";
  if (rawWebhook) {
    try {
      if (new URL(rawWebhook).protocol === "https:") channels.push("WEBHOOK");
    } catch {
      // Invalid configuration is reported by production env validation.
    }
  }

  return channels;
}

function minimumExternalSeverity(): SecuritySeverity {
  return normalizeSecuritySeverity(
    process.env.ELORIA_SECURITY_ALERT_MIN_SEVERITY,
    "HIGH",
  );
}

function safeFingerprint(value: string | null | undefined): string | null {
  try {
    return securityFingerprint(value);
  } catch (error) {
    console.error("[Eloria Security Event] Fingerprint unavailable.", error);
    return null;
  }
}

function eventTypeOf(value: string): string {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_:-]/g, "_")
    .slice(0, 100);
  return normalized || "SECURITY_EVENT";
}

export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  const eventType = eventTypeOf(input.eventType);
  const severity = input.severity;
  const successful = input.successful ?? false;
  const ipHash = safeFingerprint(input.ip);
  const subjectHash = safeFingerprint(
    input.subject ? `subject:${input.subject}` : null,
  );
  const details = sanitizeSecurityPayload(input.details ?? null);

  const payload: SecurityJson = {
    severity,
    scope: input.scope,
    subjectHash,
    details,
  };

  const shouldQueueExternal =
    input.external !== false &&
    securitySeverityRank(severity) >=
      securitySeverityRank(minimumExternalSeverity());

  const channels = shouldQueueExternal ? configuredChannels() : [];
  const cooldownSeconds = intEnv(
    "ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS",
    300,
    30,
    3600,
  );
  const bucket = Math.floor(Date.now() / (cooldownSeconds * 1000));
  const dispatchIdentity =
    safeFingerprint(
      input.dispatchKey?.trim() ||
        subjectHash ||
        ipHash ||
        eventType,
    );

  try {
    await prisma.$transaction(async tx => {
      const event = await tx.adminSecurityEvent.create({
        data: {
          eventType,
          successful,
          ipHash,
          userAgent: input.userAgent?.slice(0, 500) || null,
          payload: json(payload),
        },
      });

      if (!channels.length || !dispatchIdentity) return;

      const outboxRows = channels.flatMap(channel => {
        const dedupeKey = safeFingerprint(
          `${eventType}:${dispatchIdentity}:${bucket}:${channel}`,
        );
        return dedupeKey
          ? [{
              sourceEventId: event.id,
              eventType,
              severity,
              scope: input.scope,
              channel,
              status: "PENDING",
              dedupeKey,
              payload: json(payload),
              nextAttemptAt: new Date(),
            }]
          : [];
      });

      if (!outboxRows.length) return;

      await tx.securityAlert.createMany({
        data: outboxRows,
        skipDuplicates: true,
      });
    });
  } catch (error) {
    // Security telemetry must never break authentication or payment flows.
    console.error("[Eloria Security Event] Audit/outbox persistence failed.", error);
  }
}
