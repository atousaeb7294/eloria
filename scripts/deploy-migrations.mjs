import { spawnSync } from "node:child_process";

const recoverableMigration =
  "20260920234500_zero_sales_tax_and_closed_market_margin";

function runPrisma(args, capture = false) {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  return spawnSync(command, ["prisma", ...args], {
    encoding: "utf8",
    env: process.env,
    stdio: capture ? "pipe" : "inherit",
  });
}

function printCaptured(result) {
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
}

const deploy = runPrisma(["migrate", "deploy"], true);
printCaptured(deploy);

if (deploy.status === 0) {
  process.exit(0);
}

const output = `${deploy.stdout ?? ""}\n${deploy.stderr ?? ""}`;
const isKnownFailedMigration =
  output.includes("P3009") && output.includes(recoverableMigration);

if (!isKnownFailedMigration) {
  console.error(
    "Database migration failed and was not automatically changed because it is not the known ELORIA V9 failure.",
  );
  process.exit(deploy.status ?? 1);
}

console.warn(
  `Recovering the known failed migration: ${recoverableMigration}`,
);

const resolve = runPrisma([
  "migrate",
  "resolve",
  "--rolled-back",
  recoverableMigration,
]);

if (resolve.status !== 0) {
  process.exit(resolve.status ?? 1);
}

const retry = runPrisma(["migrate", "deploy"]);
process.exit(retry.status ?? 1);
