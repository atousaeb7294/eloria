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
        "poweredByHeader: false",
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
      "Payment callback uses configured site origin",
      (await fileIncludes("src/app/api/payments/zarinpal/callback/route.ts", [
        "siteBaseUrl",
        'from "@/lib/site-url"',
      ])) &&
        !(await fileIncludes(
          "src/app/api/payments/zarinpal/callback/route.ts",
          ", request.url)",
        )),
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
      "Dedicated health secret separation",
      (await fileIncludes("src/app/api/health/route.ts", "ELORIA_HEALTH_SECRET")) &&
        (await fileIncludes("src/lib/env-validation.ts", [
          "ELORIA_HEALTH_SECRET",
          "CRON_SECRET",
        ])),
    ],
    [
      "Bounded public JSON request bodies",
      (await fileIncludes("src/lib/security/json-body.ts", "ELORIA_FINAL_JSON_BODY_LIMIT_V1")) &&
        (await fileIncludes("src/app/api/checkout/orders/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/payments/zarinpal/start/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/support/contact/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/treasury/products/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/customer/auth/request-otp/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/customer/auth/verify-otp/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/customer/me/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/customer/addresses/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/customer/addresses/[id]/route.ts", "readJsonBody")) &&
        (await fileIncludes("src/app/api/customer/favorites/route.ts", "readJsonBody")),
    ],
    [
      "Sanitized admin and provider-facing errors",
      (await fileIncludes("src/app/[locale]/admin/(protected)/orders/actions.ts", "publicOrderActionError")) &&
        (await fileIncludes("src/app/[locale]/admin/(protected)/products/actions.ts", "publicAdminProductError")) &&
        (await fileIncludes("src/app/[locale]/admin/(protected)/products/assets/actions.ts", "publicAssetError")) &&
        (await fileIncludes("src/lib/product-media-storage.ts", "Supabase upload failed")),
    ],
    [
      "Payment verification payload minimization",
      await fileIncludes("src/lib/payment-service.ts", "paymentVerificationSnapshot"),
    ],
    [
      "Production secret generator completeness",
      await fileIncludes("scripts/generate-production-secrets.mjs", [
        "ELORIA_CUSTOMER_AUTH_SECRET",
        "ELORIA_HEALTH_SECRET",
      ]),
    ],
    [
      "Security alert outbox and retry worker",
      (await fileIncludes("src/lib/security/security-events.ts", [
        "securityAlert.createMany",
        "sanitizeSecurityPayload",
        "ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS",
      ])) &&
        (await fileIncludes("src/lib/security/security-alert-worker.ts", [
          "PROCESSING",
          "securityAlertBackoffMs",
          "MAX_ATTEMPTS",
          "AbortSignal.timeout",
        ])) &&
        (await fileIncludes("src/app/api/cron/security-alerts/route.ts", [
          "acquireCronLease",
          "CRON_SECRET",
        ])) &&
        (await fileIncludes("src/app/[locale]/admin/(protected)/security/page.tsx", [
          "امنیت و هشدارها",
          "Delivery Outbox",
        ])) &&
        (await fileIncludes("src/components/admin/admin-shell.tsx", "/security")),
    ],
    [
      "Customer authentication security telemetry",
      (await fileIncludes("src/app/api/customer/auth/request-otp/route.ts", [
        "CUSTOMER_OTP_IP_RATE_LIMITED",
        "CUSTOMER_OTP_MOBILE_RATE_LIMITED",
        "CUSTOMER_TURNSTILE_FAILED",
      ])) &&
        (await fileIncludes("src/app/api/customer/auth/verify-otp/route.ts", [
          "CUSTOMER_OTP_VERIFY_RATE_LIMITED",
          "CUSTOMER_OTP_VERIFY_FAILED",
          "CUSTOMER_LOGIN_SUCCEEDED",
        ])),
    ],
    [
      "Payment anomaly security alerts",
      await fileIncludes("src/lib/payment-service.ts", [
        "PAYMENT_INITIALIZATION_FAILED",
        "PAYMENT_STALE_CALLBACK_IGNORED",
        "PAYMENT_VERIFICATION_RETRY_REQUIRED",
        "PAYMENT_REQUIRES_REVIEW",
        "recordSecurityEvent",
      ]),
    ],
    [
      "Legal seller identity and policy gate",
      (await fileIncludes("src/lib/env-validation.ts", [
        "ELORIA_LEGAL_SELLER_NAME",
        "ELORIA_LEGAL_BUSINESS_ADDRESS",
        "ELORIA_LEGAL_CONTACT",
      ])) &&
        (await fileIncludes("src/app/[locale]/policies/[policy]/layout.tsx", [
          "hasCompleteLegalIdentity",
          "ELORIA_LEGAL_PAGES_INDEX",
        ])) &&
        (await fileIncludes("src/app/[locale]/policies/[policy]/page.tsx", [
          "legalBusinessIdentity",
          "حداقل هفت روز کاری",
          "مشخصات فردی مشتری",
        ])),
    ],
    [
      "Production security alert channel requirement",
      await fileIncludes("src/lib/env-validation.ts", [
        "ELORIA_SECURITY_ALERT_CHANNEL",
        "ELORIA_SECURITY_ALERT_MIN_SEVERITY",
        "ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS",
      ]),
    ],
    [
      "Security alert migration",
      await fileIncludes(
        "prisma/migrations/20260816133000_security_alert_outbox/migration.sql",
        ["security_alerts", "dedupeKey", "PROCESSING"],
      ),
    ],
    [
      "Bounded SMS provider request",
      await fileIncludes("src/lib/notifications/kavenegar.ts", "AbortSignal.timeout(8_000)"),
    ],
    [
      "Metal-rate anomaly circuit breaker",
      (await fileIncludes("src/lib/metal-rate-anomaly.ts", [
        "DEVIATION_TOO_HIGH",
        "OUTSIDE_ABSOLUTE_RANGE",
      ])) &&
        (await fileIncludes("src/lib/metal-price-sync.ts", [
          "METAL_RATE_ANOMALY_REJECTED",
          "ANOMALOUS_RATE_REJECTED",
        ])),
    ],
    [
      "Guest payment-start authorization",
      (await fileIncludes("src/lib/payment-start-authorization.ts", [
        "createPaymentStartAuthorization",
        "timingSafeEqual",
      ])) &&
        (await fileIncludes("src/app/api/payments/zarinpal/start/route.ts", [
          "verifyPaymentStartAuthorization",
          "getCustomerFromRequest",
        ])),
    ],
    [
      "Historical guest order privacy",
      !(await fileIncludes("src/lib/customer-auth.ts", "customerMobile: mobile")),
    ],
    [
      "Structured refund reference",
      (await fileIncludes("src/lib/order-operations.ts", [
        "refundReference",
        "شماره مرجع",
      ])) &&
        (await fileIncludes("prisma/schema.prisma", "refundReference")),
    ],
    [
      "Data retention cron",
      (await fileIncludes("src/lib/data-retention.ts", "runDataRetention")) &&
        (await fileIncludes("src/app/api/cron/data-retention/route.ts", "CRON_SECRET")),
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
