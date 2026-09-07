/* ELORIA_SECURITY_ALERT_POLICY_V1 */
import { createHmac } from "node:crypto";

export const SECURITY_SEVERITIES = [
  "INFO",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export type SecuritySeverity = (typeof SECURITY_SEVERITIES)[number];

export type SecurityScope =
  | "ADMIN_AUTH"
  | "CUSTOMER_AUTH"
  | "PAYMENT"
  | "SYSTEM";

export type SecurityAlertChannel = "SMS" | "WEBHOOK";

export type SecurityJson =
  | string
  | number
  | boolean
  | null
  | SecurityJson[]
  | { [key: string]: SecurityJson };

const SENSITIVE_KEY_PATTERN =
  /(pass(word)?|otp|one.?time|token|secret|authorization|cookie|session|mobile|phone|email|address|postal|card|pan|cvv|pin|api.?key|merchant)/i;

const MAX_DEPTH = 3;
const MAX_KEYS = 24;
const MAX_ARRAY_ITEMS = 12;
const MAX_STRING_LENGTH = 220;

function safeString(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .slice(0, MAX_STRING_LENGTH);
}

export function sanitizeSecurityPayload(
  value: unknown,
  depth = 0,
): SecurityJson {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return safeString(value);
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();

  if (depth >= MAX_DEPTH) return "[truncated]";

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_ARRAY_ITEMS)
      .map(item => sanitizeSecurityPayload(item, depth + 1));
  }

  if (typeof value === "object") {
    const output: Record<string, SecurityJson> = {};
    const entries = Object.entries(value as Record<string, unknown>)
      .slice(0, MAX_KEYS);

    for (const [rawKey, rawValue] of entries) {
      const key = safeString(rawKey).slice(0, 80);
      if (!key) continue;
      output[key] = SENSITIVE_KEY_PATTERN.test(key)
        ? "[redacted]"
        : sanitizeSecurityPayload(rawValue, depth + 1);
    }

    return output;
  }

  return safeString(String(value));
}

function fingerprintSecret(): string {
  const primary = process.env.ELORIA_CUSTOMER_AUTH_SECRET?.trim();
  if (primary && primary.length >= 48) return primary;
  const admin = process.env.ELORIA_ADMIN_SESSION_SECRET?.trim();
  if (admin && admin.length >= 48) return admin;
  if (process.env.NODE_ENV === "production") {
    throw new Error("Security fingerprint secret is not configured.");
  }
  return "eloria-development-security-fingerprint-secret-not-for-production";
}

export function securityFingerprint(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  if (!normalized) return null;
  return createHmac("sha256", fingerprintSecret())
    .update(`security-fingerprint:${normalized}`)
    .digest("hex");
}

export function securitySeverityRank(value: SecuritySeverity): number {
  return SECURITY_SEVERITIES.indexOf(value);
}

export function normalizeSecuritySeverity(
  value: string | null | undefined,
  fallback: SecuritySeverity = "HIGH",
): SecuritySeverity {
  const normalized = value?.trim().toUpperCase();
  return SECURITY_SEVERITIES.includes(normalized as SecuritySeverity)
    ? (normalized as SecuritySeverity)
    : fallback;
}

export function securityAlertBackoffMs(attempts: number): number {
  const safeAttempts = Math.max(1, Math.trunc(attempts));
  return Math.min(60_000 * 2 ** (safeAttempts - 1), 30 * 60_000);
}
