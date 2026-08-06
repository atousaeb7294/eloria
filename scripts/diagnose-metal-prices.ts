import "dotenv/config";

import { databasePool, prisma } from "../src/lib/prisma";
import { syncMetalPrices } from "../src/lib/metal-price-sync";
import { getMetalPriceSnapshot, invalidateMetalPriceReadCache } from "../src/lib/metal-prices";

async function main() {
  const shouldSync = process.argv.includes("--sync");

  if (shouldSync) {
    console.log("Synchronizing metal prices before diagnosis...");
    const synced = await syncMetalPrices();
    invalidateMetalPriceReadCache();
    console.log(
      JSON.stringify(
        synced.map((rate) => ({
          material: rate.material,
          sourceSymbol: rate.sourceSymbol,
          sourceTimeUnix: rate.sourceTimeUnix,
          appliedToCurrent: rate.appliedToCurrent,
          writeReason: rate.writeReason,
        })),
        null,
        2,
      ),
    );
  }

  const snapshot = await getMetalPriceSnapshot();
  const rows = snapshot.prices.map((price) => ({
    material: price.material,
    source: price.source,
    sourceSymbol: price.sourceSymbol,
    marketTimestamp: price.marketTimestamp,
    ageHours:
      typeof price.ageSeconds === "number"
        ? Number((price.ageSeconds / 3600).toFixed(2))
        : null,
    freshnessReason: price.freshnessReason,
    saleMode: price.saleMode,
    saleReason: price.saleReason,
    usable: price.isUsableForSale,
    maxAgeMinutes: price.closedMarketMaxAgeMinutes,
    safetyMarginPercent: price.appliedSafetyMarginPercent,
    originalPrice: price.pricePerGramToman,
    effectivePrice: price.effectivePricePerGramToman,
  }));

  console.table(rows);
  console.log(JSON.stringify(rows, null, 2));

  if (rows.length !== 2 || rows.some((row) => !row.usable)) {
    process.exitCode = 2;
  }
}

main()
  .catch((error) => {
    console.error("Metal-price diagnosis failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await databasePool.end();
  });
