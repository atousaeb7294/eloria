import "dotenv/config";

import {
  getCollectionCatalog,
} from "../src/lib/catalog";
import { prisma } from "../src/lib/prisma";

async function main() {
  const catalog =
    await getCollectionCatalog(
      "necklaces",
    );

  console.log(
    JSON.stringify(
      {
        successful: true,

        collection:
          catalog.collection,

        productCount:
          catalog.products.length,

        products:
          catalog.products,
      },
      null,
      2,
    ),
  );

  const testProduct =
    catalog.products.find(
      (product) =>
        product.slug ===
        "eloria-test-necklace",
    );

  if (!testProduct) {
    throw new Error(
      "محصول آزمایشی در گنجینه گردنبند پیدا نشد.",
    );
  }

  if (
    testProduct.material !== "GOLD"
  ) {
    throw new Error(
      "جنس محصول آزمایشی صحیح نیست.",
    );
  }

  if (!testProduct.image) {
    throw new Error(
      "تصویر محصول آزمایشی پیدا نشد.",
    );
  }

  console.log(
    "✓ تست کاتالوگ محصولات با موفقیت انجام شد.",
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "تست کاتالوگ ناموفق بود:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });