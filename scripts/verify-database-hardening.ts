import "dotenv/config";

import { databasePool, prisma } from "../src/lib/prisma";

type RequiredObjectsRow = {
  rateLimitBuckets: string | null;
  cronLeases: string | null;
  adminSessions: string | null;
  securityAlerts: string | null;
  shipments: string | null;
  migrationTable: string | null;
};

type AppliedMigrationRow = {
  migrationName: string;
  finishedAt: Date | null;
  rolledBackAt: Date | null;
};

async function main() {
  const [objects] = await prisma.$queryRaw<RequiredObjectsRow[]>`
    SELECT
      to_regclass('public.rate_limit_buckets')::text AS "rateLimitBuckets",
      to_regclass('public.cron_leases')::text AS "cronLeases",
      to_regclass('public.admin_sessions')::text AS "adminSessions",
      to_regclass('public.security_alerts')::text AS "securityAlerts",
      to_regclass('public.shipments')::text AS "shipments",
      to_regclass('public._prisma_migrations')::text AS "migrationTable"
  `;

  const missingObjects = [
    ["rate_limit_buckets", objects?.rateLimitBuckets],
    ["cron_leases", objects?.cronLeases],
    ["admin_sessions", objects?.adminSessions],
    ["security_alerts", objects?.securityAlerts],
    ["shipments", objects?.shipments],
    ["_prisma_migrations", objects?.migrationTable],
  ].filter(([, value]) => !value);

  let migrations: AppliedMigrationRow[] = [];
  if (objects?.migrationTable) {
    migrations = await prisma.$queryRaw<AppliedMigrationRow[]>`
      SELECT
        migration_name AS "migrationName",
        finished_at AS "finishedAt",
        rolled_back_at AS "rolledBackAt"
      FROM _prisma_migrations
      ORDER BY started_at ASC
    `;
  }

  const policies = await prisma.pricingPolicy.findMany({
    where: { material: { in: ["GOLD", "SILVER"] } },
    select: {
      material: true,
      closedMarketPricingEnabled: true,
      closedMarketMaxAgeMinutes: true,
      closedMarketSafetyMarginPercent: true,
      isActive: true,
    },
    orderBy: { material: "asc" },
  });

  const requiredMigrations = [
    "00000000000000_existing_schema_baseline",
    "20260804000100_commerce_hardening",
    "20260806023000_closed_market_safety_tiers",
    "20260806030000_closed_market_10_day_safety",
    "20260806031000_runtime_support_repair",
    "20260815033000_customer_accounts",
    "20260815034500_customer_db_defaults_hotfix",
    "20260815035500_customer_legacy_schema_compat",
    "20260815040500_customer_address_legacy_compat",
    "20260816133000_security_alert_outbox",
    "20260816190000_professional_hardening",
  ];

  const appliedMigrationNames = new Set(
    migrations
      .filter((migration) => migration.finishedAt && !migration.rolledBackAt)
      .map((migration) => migration.migrationName),
  );

  const missingMigrations = requiredMigrations.filter(
    (migration) => !appliedMigrationNames.has(migration),
  );

  const policyProblems = policies.filter(
    (policy) =>
      !policy.isActive ||
      !policy.closedMarketPricingEnabled ||
      policy.closedMarketMaxAgeMinutes !== 14_400,
  );

  console.log("ELORIA database verification\n");
  console.log("Required database objects:");
  for (const [name, value] of [
    ["rate_limit_buckets", objects?.rateLimitBuckets],
    ["cron_leases", objects?.cronLeases],
    ["admin_sessions", objects?.adminSessions],
    ["security_alerts", objects?.securityAlerts],
    ["shipments", objects?.shipments],
    ["_prisma_migrations", objects?.migrationTable],
  ]) {
    console.log(`${value ? "PASS" : "FAIL"}  ${name}`);
  }

  console.log("\nClosed-market policies:");
  for (const policy of policies) {
    console.log(
      `${policy.material.padEnd(6)} enabled=${String(policy.closedMarketPricingEnabled).padEnd(5)} ` +
        `maxAgeMinutes=${policy.closedMarketMaxAgeMinutes} ` +
        `minimumMargin=${policy.closedMarketSafetyMarginPercent.toString()}%`,
    );
  }

  console.log("\nApplied migrations:");
  for (const migration of requiredMigrations) {
    console.log(`${appliedMigrationNames.has(migration) ? "PASS" : "FAIL"}  ${migration}`);
  }

  if (
    missingObjects.length > 0 ||
    missingMigrations.length > 0 ||
    policies.length !== 2 ||
    policyProblems.length > 0
  ) {
    console.error("\nDatabase verification failed.");
    process.exitCode = 1;
    return;
  }

  console.log("\nPASS: database hardening, customer schema, security alert outbox, structured shipments, professional hardening, and 10-day closed-market policy are active.");
}

main()
  .catch((error) => {
    console.error("Database verification failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await databasePool.end();
  });
