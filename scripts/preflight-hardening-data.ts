import "dotenv/config";

import { Pool, type PoolClient } from "pg";

type CheckDefinition = {
  name: string;
  sql: string;
};

type CheckRow = {
  invalidCount: string | number | bigint;
};

const connectionString =
  process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();

if (!connectionString) {
  throw new Error("DIRECT_URL یا DATABASE_URL تنظیم نشده است.");
}

function databaseSsl(): false | { rejectUnauthorized: boolean } {
  const mode = process.env.DATABASE_SSL_MODE?.trim().toLowerCase();

  if (mode === "disable") return false;
  if (mode === "require") return { rejectUnauthorized: false };

  return { rejectUnauthorized: true };
}

const pool = new Pool({
  connectionString,
  ssl: databaseSsl(),
  min: 0,
  max: 1,
  connectionTimeoutMillis: 60_000,
  idleTimeoutMillis: 10_000,
  keepAlive: true,
  application_name: "eloria-database-preflight",
  allowExitOnIdle: true,
});

const checks: CheckDefinition[] = [
  {
    name: "products_stock",
    sql: `SELECT COUNT(*)::bigint AS "invalidCount"
          FROM products
          WHERE stock < 0`,
  },
  {
    name: "products_prices",
    sql: `SELECT COUNT(*)::bigint AS "invalidCount"
          FROM products
          WHERE (price IS NOT NULL AND price < 0)
             OR ("compareAtPrice" IS NOT NULL AND "compareAtPrice" < 0)
             OR "makingChargeFixed" < 0
             OR "makingChargePerGram" < 0
             OR "makingChargePercent" < 0
             OR "makingChargePercent" > 100
             OR "artisticFee" < 0
             OR ("profitPercent" IS NOT NULL AND ("profitPercent" < 0 OR "profitPercent" > 100))
             OR ("taxPercent" IS NOT NULL AND ("taxPercent" < 0 OR "taxPercent" > 100))`,
  },
  {
    name: "products_purity",
    sql: `SELECT COUNT(*)::bigint AS "invalidCount"
          FROM products
          WHERE "purityFineness" IS NOT NULL
            AND "purityFineness" NOT BETWEEN 1 AND 1000`,
  },
  {
    name: "variants_values",
    sql: `SELECT COUNT(*)::bigint AS "invalidCount"
          FROM product_variants
          WHERE stock < 0
             OR (price IS NOT NULL AND price < 0)
             OR ("makingChargeFixed" IS NOT NULL AND "makingChargeFixed" < 0)
             OR ("makingChargePerGram" IS NOT NULL AND "makingChargePerGram" < 0)
             OR ("makingChargePercent" IS NOT NULL AND ("makingChargePercent" < 0 OR "makingChargePercent" > 100))
             OR ("artisticFee" IS NOT NULL AND "artisticFee" < 0)
             OR ("purityFineness" IS NOT NULL AND "purityFineness" NOT BETWEEN 1 AND 1000)`,
  },
  {
    name: "pricing_policy_ranges",
    sql: `SELECT COUNT(*)::bigint AS "invalidCount"
          FROM pricing_policies
          WHERE "referencePurity" NOT BETWEEN 1 AND 1000
             OR "defaultProfitPercent" NOT BETWEEN 0 AND 100
             OR "defaultTaxPercent" NOT BETWEEN 0 AND 100
             OR "quoteTtlSeconds" <= 0
             OR "staleAfterMinutes" <= 0
             OR "closedMarketMaxAgeMinutes" <= 0
             OR "closedMarketSafetyMarginPercent" NOT BETWEEN 0 AND 100
             OR "roundingStep" <= 0`,
  },
  {
    name: "orders_money_or_dates",
    sql: `SELECT COUNT(*)::bigint AS "invalidCount"
          FROM orders
          WHERE "subtotalToman" < 0
             OR "shippingToman" < 0
             OR "discountToman" < 0
             OR "payableToman" < 0
             OR "payableToman" <> GREATEST("subtotalToman" + "shippingToman" - "discountToman", 0)
             OR "priceExpiresAt" < "priceVerifiedAt"
             OR "inventoryExpiresAt" < "inventoryReservedAt"`,
  },
  {
    name: "order_items_values",
    sql: `SELECT COUNT(*)::bigint AS "invalidCount"
          FROM order_items
          WHERE quantity <= 0
             OR "unitPriceToman" < 0
             OR "lineTotalToman" < 0
             OR "lineTotalToman" <> "unitPriceToman" * quantity
             OR "stockBeforeReservation" < 0
             OR "stockAfterReservation" < 0`,
  },
  {
    name: "payment_amount",
    sql: `SELECT COUNT(*)::bigint AS "invalidCount"
          FROM payment_attempts
          WHERE "amountToman" <= 0`,
  },
];

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function connectWithRetry(): Promise<PoolClient> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await pool.connect();
    } catch (error) {
      lastError = error;
      console.error(`Database connection attempt ${attempt}/3 failed.`);

      if (attempt < 3) {
        await delay(attempt * 1_500);
      }
    }
  }

  throw lastError;
}

async function main(): Promise<void> {
  console.log("ELORIA database hardening preflight");
  console.log("Connection: DIRECT_URL (fallback: DATABASE_URL)\n");

  const client = await connectWithRetry();

  try {
    await client.query("SET statement_timeout = 0");
    await client.query("SET lock_timeout = '10s'");

    let failed = false;

    for (const check of checks) {
      const result = await client.query<CheckRow>(check.sql);
      const count = Number(result.rows[0]?.invalidCount ?? 0);
      const status = count === 0 ? "PASS" : "ERROR";

      console.log(`${status.padEnd(6)} ${check.name.padEnd(30)} ${count}`);

      if (count > 0) {
        failed = true;
      }
    }

    if (failed) {
      throw new Error(
        "داده نامعتبر وجود دارد؛ قبل از اجرای Migration آن را اصلاح کنید.",
      );
    }

    console.log("\nتمام داده‌های فعلی با Constraintهای Migration سازگار هستند.");
  } finally {
    client.release();
  }
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
