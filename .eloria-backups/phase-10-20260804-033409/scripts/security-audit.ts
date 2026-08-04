import { readFile } from "node:fs/promises";
import path from "node:path";

type SecurityCheck = readonly [name: string, passed: boolean];

const root = process.cwd();

async function fileIncludes(file: string, value: string): Promise<boolean> {
  try {
    const content = await readFile(path.join(root, file), "utf8");
    return content.includes(value);
  } catch {
    return false;
  }
}

async function main(): Promise<void> {
  const checks: SecurityCheck[] = [
    [
      "Security headers",
      await fileIncludes("next.config.ts", "Content-Security-Policy"),
    ],
    [
      "Admin login rate limit",
      await fileIncludes(
        "src/app/[locale]/admin/login/actions.ts",
        "admin-login:",
      ),
    ],
    [
      "Checkout origin check",
      await fileIncludes(
        "src/app/api/checkout/orders/route.ts",
        "hasTrustedOrigin",
      ),
    ],
    [
      "Payment verification",
      await fileIncludes(
        "src/lib/payment-service.ts",
        "verifyZarinpalPayment",
      ),
    ],
    [
      "Cron bearer secret",
      await fileIncludes(
        "src/app/api/cron/metal-prices/route.ts",
        "timingSafeEqual",
      ),
    ],
    [
      "Health endpoint",
      await fileIncludes("src/app/api/health/route.ts", "SELECT 1"),
    ],
  ];

  for (const [name, passed] of checks) {
    console.log(`${passed ? "PASS" : "FAIL"}  ${name}`);
  }

  const failedChecks = checks.filter(([, passed]) => !passed);

  if (failedChecks.length > 0) {
    console.error(
      `\n${failedChecks.length} مورد از کنترل‌های امنیتی ناموفق بود.`,
    );
    process.exitCode = 1;
    return;
  }

  console.log("\nتمام کنترل‌های امنیتی با موفقیت انجام شدند.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nاجرای ممیزی امنیتی ناموفق بود: ${message}`);
  process.exitCode = 1;
});
