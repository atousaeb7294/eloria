import { spawnSync } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import { resolve } from "node:path";

// Verification must not use production credentials, even if present locally.
// These values exist only in child processes; no env file is created/changed.
const root = realpathSync(process.cwd());
const offlineUrl = "postgresql://offline:offline@127.0.0.1:1/eloria_offline";
const environment = {
  ...process.env,
  DATABASE_URL: offlineUrl,
  DIRECT_URL: offlineUrl,
  ELORIA_RUNTIME_DATABASE_URL: offlineUrl,
  ELORIA_CHECKOUT_DATABASE_URL: offlineUrl,
  NEXT_PUBLIC_SITE_URL: "https://eloriagallery.ir",
  NEXT_TELEMETRY_DISABLED: "1",
};
if (!existsSync(resolve(root, "node_modules/next/package.json"))) throw new Error("Run npm ci first.");
if (process.argv.slice(2).some(value => value !== "--build")) throw new Error("Only --build is supported.");
function run(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, env: environment, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
console.log("Checking without a database. Existing env files are preserved.");
run(["node_modules/prisma/build/index.js", "generate"]);
run(["node_modules/typescript/bin/tsc", "--noEmit"]);
run(["scripts/test-source-integrity.mjs"]);
for (const file of ["test-reference-gates-v11.ts", "test-home-display-fix.ts", "test-home-design.ts", "test-intro-recovery.ts", "test-product-media-storage.ts"])
  run(["--import", "tsx", `scripts/${file}`]);
if (process.argv.includes("--build")) {
  console.log("Building an OFFLINE verification copy. Database-unavailable fallback warnings are expected.");
  console.log("Rebuild on Parspack with its real environment; do not deploy this local .next folder.");
  run(["scripts/build-production.mjs"]);
}
console.log("Storefront verification passed. No migration, seed or database write was run.");
