import "dotenv/config";
import { databasePool, prisma } from "../src/lib/prisma";

type CheckRow = {
  checkName: string;
  invalidCount: bigint | number | string;
};

const rows = await prisma.$queryRaw<CheckRow[]>`
  SELECT 'products_stock' AS "checkName", COUNT(*) AS "invalidCount"
  FROM products WHERE stock < 0
  UNION ALL
  SELECT 'products_prices', COUNT(*)
  FROM products
  WHERE (price IS NOT NULL AND price < 0)
     OR ("compareAtPrice" IS NOT NULL AND "compareAtPrice" < 0)
     OR "makingChargeFixed" < 0
     OR "makingChargePerGram" < 0
     OR "makingChargePercent" < 0 OR "makingChargePercent" > 100
     OR "artisticFee" < 0
     OR ("profitPercent" IS NOT NULL AND ("profitPercent" < 0 OR "profitPercent" > 100))
     OR ("taxPercent" IS NOT NULL AND ("taxPercent" < 0 OR "taxPercent" > 100))
  UNION ALL
  SELECT 'products_purity', COUNT(*)
  FROM products WHERE "purityFineness" IS NOT NULL AND "purityFineness" NOT BETWEEN 1 AND 1000
  UNION ALL
  SELECT 'variants_values', COUNT(*)
  FROM product_variants
  WHERE stock < 0
     OR (price IS NOT NULL AND price < 0)
     OR ("makingChargeFixed" IS NOT NULL AND "makingChargeFixed" < 0)
     OR ("makingChargePerGram" IS NOT NULL AND "makingChargePerGram" < 0)
     OR ("makingChargePercent" IS NOT NULL AND ("makingChargePercent" < 0 OR "makingChargePercent" > 100))
     OR ("artisticFee" IS NOT NULL AND "artisticFee" < 0)
     OR ("purityFineness" IS NOT NULL AND "purityFineness" NOT BETWEEN 1 AND 1000)
  UNION ALL
  SELECT 'pricing_policy_ranges', COUNT(*)
  FROM pricing_policies
  WHERE "referencePurity" NOT BETWEEN 1 AND 1000
     OR "defaultProfitPercent" NOT BETWEEN 0 AND 100
     OR "defaultTaxPercent" NOT BETWEEN 0 AND 100
     OR "quoteTtlSeconds" <= 0
     OR "staleAfterMinutes" <= 0
     OR "closedMarketMaxAgeMinutes" <= 0
     OR "closedMarketSafetyMarginPercent" NOT BETWEEN 0 AND 100
     OR "roundingStep" <= 0
  UNION ALL
  SELECT 'orders_money_or_dates', COUNT(*)
  FROM orders
  WHERE "subtotalToman" < 0 OR "shippingToman" < 0 OR "discountToman" < 0 OR "payableToman" < 0
     OR "payableToman" <> GREATEST("subtotalToman" + "shippingToman" - "discountToman", 0)
     OR "priceExpiresAt" < "priceVerifiedAt"
     OR "inventoryExpiresAt" < "inventoryReservedAt"
  UNION ALL
  SELECT 'order_items_values', COUNT(*)
  FROM order_items
  WHERE quantity <= 0
     OR "unitPriceToman" < 0
     OR "lineTotalToman" < 0
     OR "lineTotalToman" <> "unitPriceToman" * quantity
     OR "stockBeforeReservation" < 0
     OR "stockAfterReservation" < 0
  UNION ALL
  SELECT 'payment_amount', COUNT(*)
  FROM payment_attempts WHERE "amountToman" <= 0
`;

let failed = false;
console.log("ELORIA database hardening preflight\n");
for (const row of rows) {
  const count = Number(row.invalidCount);
  const status = count === 0 ? "PASS" : "ERROR";
  console.log(`${status.padEnd(6)} ${row.checkName.padEnd(30)} ${count}`);
  if (count > 0) failed = true;
}

if (failed) {
  console.error("\nداده نامعتبر وجود دارد؛ قبل از اجرای Migration آن را اصلاح کنید.");
  process.exitCode = 1;
} else {
  console.log("\nتمام داده‌های فعلی با Constraintهای Migration سازگار هستند.");
}

await prisma.$disconnect();
await databasePool.end();
