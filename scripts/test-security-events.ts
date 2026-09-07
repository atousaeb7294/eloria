import {
  normalizeSecuritySeverity,
  sanitizeSecurityPayload,
  securityFingerprint,
  securitySeverityRank,
  securityAlertBackoffMs,
} from "../src/lib/security/security-event-policy";

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const sanitized = sanitizeSecurityPayload({
  orderNumber: "EL-123",
  provider: "ZARINPAL",
  password: "super-secret",
  otpCode: "123456",
  mobile: "09123456789",
  email: "customer@example.com",
  nested: {
    authorization: "Bearer secret",
    address: "private address",
    safeReason: "manual-review",
  },
});

expect(
  typeof sanitized === "object" && sanitized !== null && !Array.isArray(sanitized),
  "sanitized payload must remain an object",
);

const payload = sanitized as Record<string, unknown>;

expect(payload.orderNumber === "EL-123", "safe order number must remain");
expect(payload.provider === "ZARINPAL", "safe provider must remain");
expect(payload.password === "[redacted]", "password must be redacted");
expect(payload.otpCode === "[redacted]", "OTP must be redacted");
expect(payload.mobile === "[redacted]", "mobile must be redacted");
expect(payload.email === "[redacted]", "email must be redacted");

const nested = payload.nested as Record<string, unknown>;
expect(nested.authorization === "[redacted]", "authorization must be redacted");
expect(nested.address === "[redacted]", "address must be redacted");
expect(nested.safeReason === "manual-review", "non-sensitive reason must remain");

expect(
  securitySeverityRank("CRITICAL") > securitySeverityRank("HIGH"),
  "critical severity must outrank high",
);
expect(
  normalizeSecuritySeverity("not-valid", "HIGH") === "HIGH",
  "invalid severity must use fallback",
);
expect(
  securityFingerprint("same") === securityFingerprint("same"),
  "fingerprint must be deterministic",
);
expect(
  securityFingerprint("same") !== securityFingerprint("different"),
  "fingerprint must distinguish inputs",
);
expect(securityAlertBackoffMs(1) === 60_000, "first retry must wait one minute");
expect(securityAlertBackoffMs(5) === 960_000, "fifth retry backoff must be sixteen minutes");
expect(securityAlertBackoffMs(20) === 1_800_000, "backoff must cap at thirty minutes");

console.log("PASS  Security alert payload redaction and severity policy");
