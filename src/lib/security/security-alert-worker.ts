/* ELORIA_SECURITY_ALERT_WORKER_V1 */
import { sendSms } from "@/lib/notifications/kavenegar";
import { prisma } from "@/lib/prisma";
import {
  securityAlertBackoffMs,
  type SecurityJson,
} from "@/lib/security/security-event-policy";

const MAX_ATTEMPTS = 5;
const STALE_PROCESSING_MS = 10 * 60_000;

type DeliveryResult = {
  successful: boolean;
  errorCode?: string;
};

function objectOf(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function detailString(payload: unknown, key: string): string | null {
  const root = objectOf(payload);
  const details = objectOf(root.details);
  const value = details[key];
  return typeof value === "string" && value.trim()
    ? value.slice(0, 64)
    : null;
}

function securityAlertMobile(): string | null {
  const mobile = process.env.ELORIA_SECURITY_ALERT_MOBILE?.trim() ?? "";
  return /^09\d{9}$/.test(mobile) ? mobile : null;
}

function securityAlertWebhook(): string | null {
  const raw = process.env.ELORIA_SECURITY_ALERT_WEBHOOK_URL?.trim() ?? "";
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

async function deliverSms(alert: {
  eventType: string;
  severity: string;
  payload: unknown;
}): Promise<DeliveryResult> {
  const mobile = securityAlertMobile();
  if (!mobile) return { successful: false, errorCode: "SMS_CHANNEL_NOT_CONFIGURED" };

  const orderNumber = detailString(alert.payload, "orderNumber");
  const message = [
    "الوریا - هشدار امنیتی",
    alert.severity,
    alert.eventType,
    orderNumber ? `سفارش ${orderNumber}` : null,
  ].filter(Boolean).join(" | ");

  const result = await sendSms(mobile, message);
  return result.successful
    ? { successful: true }
    : { successful: false, errorCode: "SMS_DELIVERY_FAILED" };
}

async function deliverWebhook(alert: {
  eventType: string;
  severity: string;
  scope: string;
  payload: SecurityJson;
}): Promise<DeliveryResult> {
  const url = securityAlertWebhook();
  if (!url) {
    return { successful: false, errorCode: "WEBHOOK_CHANNEL_NOT_CONFIGURED" };
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Eloria-Security-Alerts/1.0",
      },
      body: JSON.stringify({
        source: "eloria",
        eventType: alert.eventType,
        severity: alert.severity,
        scope: alert.scope,
        occurredAt: new Date().toISOString(),
        payload: alert.payload,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    return response.ok
      ? { successful: true }
      : {
          successful: false,
          errorCode: `WEBHOOK_HTTP_${response.status}`,
        };
  } catch {
    return { successful: false, errorCode: "WEBHOOK_NETWORK_ERROR" };
  }
}

export async function processSecurityAlertQueue(input: {
  batchSize?: number;
} = {}) {
  const batchSize = Math.min(Math.max(Math.trunc(input.batchSize ?? 25), 1), 100);
  const now = new Date();

  const recovered = await prisma.securityAlert.updateMany({
    where: {
      status: "PROCESSING",
      lastAttemptAt: {
        lt: new Date(now.getTime() - STALE_PROCESSING_MS),
      },
    },
    data: {
      status: "PENDING",
      nextAttemptAt: now,
      lastError: "STALE_PROCESSING_RECOVERED",
    },
  });

  const pending = await prisma.securityAlert.findMany({
    where: {
      status: "PENDING",
      nextAttemptAt: { lte: now },
      attempts: { lt: MAX_ATTEMPTS },
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
  });

  let sent = 0;
  let retried = 0;
  let failed = 0;

  for (const alert of pending) {
    const claimed = await prisma.securityAlert.updateMany({
      where: {
        id: alert.id,
        status: "PENDING",
      },
      data: {
        status: "PROCESSING",
        attempts: { increment: 1 },
        lastAttemptAt: new Date(),
      },
    });

    if (claimed.count !== 1) continue;

    let result: DeliveryResult;
    if (alert.channel === "SMS") {
      result = await deliverSms(alert);
    } else if (alert.channel === "WEBHOOK") {
      result = await deliverWebhook({
        eventType: alert.eventType,
        severity: alert.severity,
        scope: alert.scope,
        payload: alert.payload as SecurityJson,
      });
    } else {
      result = { successful: false, errorCode: "UNSUPPORTED_CHANNEL" };
    }

    if (result.successful) {
      await prisma.securityAlert.update({
        where: { id: alert.id },
        data: {
          status: "SENT",
          sentAt: new Date(),
          lastError: null,
        },
      });
      sent += 1;
      continue;
    }

    const nextAttempts = alert.attempts + 1;
    const terminal = nextAttempts >= MAX_ATTEMPTS;

    await prisma.securityAlert.update({
      where: { id: alert.id },
      data: {
        status: terminal ? "FAILED" : "PENDING",
        nextAttemptAt: new Date(
          Date.now() + securityAlertBackoffMs(nextAttempts),
        ),
        lastError: (result.errorCode ?? "DELIVERY_FAILED").slice(0, 300),
      },
    });

    if (terminal) failed += 1;
    else retried += 1;
  }

  return {
    recovered: recovered.count,
    selected: pending.length,
    sent,
    retried,
    failed,
  };
}
