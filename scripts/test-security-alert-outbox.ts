import "dotenv/config";
import { randomUUID } from "node:crypto";

import { databasePool, prisma } from "../src/lib/prisma";
import { recordSecurityEvent } from "../src/lib/security/security-events";

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function main() {
  const suffix = randomUUID().replace(/-/g, "").slice(0, 16).toUpperCase();
  const eventType = `SECURITY_ALERT_TEST_${suffix}`;

  const previous = {
    webhook: process.env.ELORIA_SECURITY_ALERT_WEBHOOK_URL,
    mobile: process.env.ELORIA_SECURITY_ALERT_MOBILE,
    severity: process.env.ELORIA_SECURITY_ALERT_MIN_SEVERITY,
    cooldown: process.env.ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS,
  };

  process.env.ELORIA_SECURITY_ALERT_WEBHOOK_URL = "https://alerts.invalid/test";
  delete process.env.ELORIA_SECURITY_ALERT_MOBILE;
  process.env.ELORIA_SECURITY_ALERT_MIN_SEVERITY = "HIGH";
  process.env.ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS = "300";

  try {
    await recordSecurityEvent({
      eventType,
      severity: "HIGH",
      scope: "SYSTEM",
      successful: false,
      subject: "09123456789",
      details: {
        orderNumber: "TEST-ORDER",
        mobile: "09123456789",
        otpCode: "123456",
        reason: "outbox-self-test",
      },
      dispatchKey: suffix,
    });

    const event = await prisma.adminSecurityEvent.findFirst({
      where: { eventType },
      orderBy: { createdAt: "desc" },
      include: { alerts: true },
    });

    expect(Boolean(event), "security event was not persisted");
    expect(event!.alerts.length === 1, "expected one webhook outbox row");

    const alert = event!.alerts[0]!;
    expect(alert.channel === "WEBHOOK", "expected WEBHOOK channel");
    expect(alert.status === "PENDING", "new alert must start as PENDING");
    expect(alert.attempts === 0, "new alert must have zero attempts");

    const serialized = JSON.stringify(alert.payload);
    expect(!serialized.includes("09123456789"), "mobile leaked into alert payload");
    expect(!serialized.includes("123456"), "OTP leaked into alert payload");
    expect(serialized.includes("TEST-ORDER"), "safe order number should remain");

    await prisma.adminSecurityEvent.delete({ where: { id: event!.id } });
    const orphan = await prisma.securityAlert.findUnique({ where: { id: alert.id } });
    expect(orphan === null, "security alert must cascade-delete with source event");

    console.log("PASS  Security alert outbox persistence, redaction, and cascade cleanup");
  } finally {
    if (previous.webhook === undefined) delete process.env.ELORIA_SECURITY_ALERT_WEBHOOK_URL;
    else process.env.ELORIA_SECURITY_ALERT_WEBHOOK_URL = previous.webhook;

    if (previous.mobile === undefined) delete process.env.ELORIA_SECURITY_ALERT_MOBILE;
    else process.env.ELORIA_SECURITY_ALERT_MOBILE = previous.mobile;

    if (previous.severity === undefined) delete process.env.ELORIA_SECURITY_ALERT_MIN_SEVERITY;
    else process.env.ELORIA_SECURITY_ALERT_MIN_SEVERITY = previous.severity;

    if (previous.cooldown === undefined) delete process.env.ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS;
    else process.env.ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS = previous.cooldown;
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await databasePool.end();
  });
