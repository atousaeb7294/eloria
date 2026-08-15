import { readFile } from "node:fs/promises";
import path from "node:path";

type SecurityCheck = readonly [name: string, passed: boolean];
const root = process.cwd();

async function fileIncludes(
  file: string,
  values: string | string[],
): Promise<boolean> {
  try {
    const content = await readFile(path.join(root, file), "utf8");
    return (Array.isArray(values) ? values : [values]).every(value =>
      content.includes(value),
    );
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const checks: SecurityCheck[] = [
    [
      "Security headers and HSTS",
      await fileIncludes("next.config.ts", [
        "Content-Security-Policy",
        "Strict-Transport-Security",
      ]),
    ],
    [
      "Shared database rate limiter",
      await fileIncludes("src/lib/security/rate-limit.ts", [
        "rate_limit_buckets",
        "ELORIA_RATE_LIMIT_FAILURE_MODE",
        'mode === "fallback"',
      ]),
    ],
    [
      "Strict proxy provider handling",
      await fileIncludes("src/lib/security/request.ts", [
        'provider === "cloudflare"',
        'provider === "generic"',
        'return "none"',
      ]),
    ],
    [
      "Strict checkout origin",
      await fileIncludes("src/lib/security/request.ts", "sec-fetch-site"),
    ],
    [
      "Checkout anti-abuse controls",
      (await fileIncludes("src/app/api/checkout/orders/route.ts", [
        "verifyTurnstileToken",
        "checkout-mobile:",
      ])) &&
        (await fileIncludes("src/lib/checkout-order.ts", "PENDING_ORDER_LIMIT")),
    ],
    [
      "Turnstile bounded verification",
      await fileIncludes("src/lib/security/turnstile.ts", [
        "AbortSignal.timeout",
        "hostname-mismatch",
      ]),
    ],
    [
      "Admin dual rate limiting",
      await fileIncludes("src/app/[locale]/admin/login/actions.ts", [
        "admin-login-ip:",
        "admin-login:",
      ]),
    ],
    [
      "Payment idempotency key",
      await fileIncludes("src/lib/payment-service.ts", [
        "activeKey",
        "Stale payment initialization",
      ]),
    ],
    [
      "Payment verification lease",
      await fileIncludes("src/lib/payment-service.ts", [
        "verificationLeaseExpiresAt",
        "PAYMENT_VERIFIED_REQUIRES_REVIEW",
      ]),
    ],
    [
      "Stale callback protection",
      await fileIncludes(
        "src/lib/payment-service.ts",
        "STALE_PAYMENT_CALLBACK_IGNORED",
      ),
    ],
    [
      "Signed payment receipt",
      await fileIncludes("src/lib/payment-receipt-token.ts", "createHmac"),
    ],
    [
      "Signed private order tracking",
      await fileIncludes("src/lib/order-tracking-token.ts", "timingSafeEqual"),
    ],
    [
      "Revocable admin sessions",
      await fileIncludes("src/lib/admin-auth.ts", [
        "adminSession",
        "revokedAt",
      ]),
    ],
    [
      "Admin TOTP",
      await fileIncludes("src/lib/admin-auth.ts", [
        "totpAt",
        "ELORIA_ADMIN_TOTP_SECRET",
      ]),
    ],
    [
      "Cron distributed lease",
      await fileIncludes("src/lib/cron-lease.ts", "lockedUntil"),
    ],
    [
      "Production env validates proxy/rate-mode/secret separation",
      await fileIncludes("src/lib/env-validation.ts", [
        "ELORIA_PROXY_PROVIDER",
        "ELORIA_RATE_LIMIT_FAILURE_MODE",
        "ELORIA_SECRET_SEPARATION",
      ]),
    ],
    [
      "Prisma production migrations",
      await fileIncludes(
        "prisma/migrations/20260804000100_commerce_hardening/migration.sql",
        "orders_total_consistency",
      ),
    ],
    [
      "Standalone Docker healthcheck",
      await fileIncludes("Dockerfile", ["standalone", "HEALTHCHECK"]),
    ],
    [
      "Health endpoint",
      await fileIncludes("src/app/api/health/route.ts", "SELECT 1"),
    ],
  ];

  for (const [name, passed] of checks) {
    console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
  }

  const failed = checks.filter(([, passed]) => !passed);
  if (failed.length) {
    console.error(`\n${failed.length} کنترل امنیتی ناموفق بود.`);
    process.exitCode = 1;
    return;
  }

  console.log(
    "\nتمام کنترل‌های استاتیک Hardening با موفقیت انجام شدند. تست درگاه، DAST و تست نفوذ همچنان باید روی Staging اجرا شوند.",
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
