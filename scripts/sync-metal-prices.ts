import "dotenv/config";

import { getMetalPriceSnapshot } from "../src/lib/metal-prices";
import { syncMetalPrices } from "../src/lib/metal-price-sync";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log(
    "در حال دریافت نرخ‌های جدید...",
  );

  const syncedRates =
    await syncMetalPrices();

  console.log(
    "نرخ‌های ذخیره‌شده:",
  );

  console.log(
    JSON.stringify(
      syncedRates,
      null,
      2,
    ),
  );

  const snapshot =
    await getMetalPriceSnapshot();

  console.log(
    "وضعیت فعلی دیتابیس:",
  );

  console.log(
    JSON.stringify(
      snapshot,
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(
      "همگام‌سازی ناموفق بود:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });