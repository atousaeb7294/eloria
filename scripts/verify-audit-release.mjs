import { spawnSync } from "node:child_process";
// All test DB references are deliberately isolated from any local production .env.
const env = { ...process.env, NODE_ENV: "test", DATABASE_URL: "postgresql://audit:audit@127.0.0.1:5432/eloria_audit_test", DIRECT_URL: "postgresql://audit:audit@127.0.0.1:5432/eloria_audit_test", ELORIA_RUNTIME_DATABASE_URL: "postgresql://audit:audit@127.0.0.1:5432/eloria_audit_test", ELORIA_CHECKOUT_DATABASE_URL: "postgresql://audit:audit@127.0.0.1:5432/eloria_audit_test", DATABASE_SSL_MODE: "disable" };
const checks = [
  ["TypeScript", ["node_modules/typescript/bin/tsc", "--noEmit"]],
  ["ESLint", ["node_modules/eslint/bin/eslint.js"]],
  ["Audit regression fixes", ["--import", "tsx", "scripts/test-audit-fixes.ts"]],
  ["Purchase recovery", ["--import", "tsx", "scripts/test-purchase-recovery.ts"]],
  ["Intro recovery", ["--import", "tsx", "scripts/test-intro-recovery.ts"]],
  ["Database SSL compatibility", ["--import", "tsx", "scripts/test-database-ssl.mjs"]],
  ["Maintenance jobs", ["scripts/test-maintenance-scheduler.mjs"]],
  ["Offline cache", ["scripts/test-offline-cache.mjs"]],
  ["Motion", ["--import", "tsx", "scripts/test-treasury-motion.mjs"]],
  ["Media", ["--import", "tsx", "scripts/test-product-media-storage.ts"]],
  ["Pricing", ["--import", "tsx", "scripts/test-pricing-engine.ts"]],
  ["Presentation", ["--import", "tsx", "scripts/test-product-presentation.ts"]],
  ["Security regressions", ["--import", "tsx", "scripts/test-security-regressions.ts"]],
  ["SEO", ["--import", "tsx", "scripts/test-storefront-seo-regressions.ts"]],
  ["Purchase first render", ["--import", "tsx", "scripts/test-live-purchase.ts"]],
  ["Critical contracts", ["--import", "tsx", "scripts/test-critical-regressions.ts"]],
  ["Backup fixtures", ["scripts/test-backup-tools.mjs"]],
  ["Operations monitor", ["scripts/test-operations-agent.mjs"]],
  ["Supply chain", ["scripts/check-supply-chain.mjs"]],
];
let failed = false;
for (const [name, args] of checks) {
  const result = spawnSync(process.execPath, args, { env, encoding: "utf8", timeout: 120000, maxBuffer: 4 * 1024 * 1024 });
  const passed = result.status === 0;
  console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  if (!passed) { failed = true; console.error(result.stdout, result.stderr, result.error?.message ?? ""); }
}
console.log("This offline gate does not replace production build, PostgreSQL integration, browser E2E, payment, or restore drills.");
process.exitCode = failed ? 1 : 0;
