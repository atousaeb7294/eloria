import "dotenv/config";

import { prisma } from "../src/lib/prisma";

const COLLECTION_SLUG = "necklaces";
const PRODUCT_SLUG = "eloria-test-necklace";

async function main() {
  const collection =
    await prisma.collection.findUnique({
      where: {
        slug: COLLECTION_SLUG,
      },
    });

  if (!collection) {
    throw new Error(
      `گنجینه ${COLLECTION_SLUG} در دیتابیس پیدا نشد.`,
    );
  }

  const product =
    await prisma.product.upsert({
      where: {
        slug: PRODUCT_SLUG,
      },

      update: {
        collectionId: collection.id,

        sku: "ELORIA-TEST-GOLD-001",

        nameFa: "گردنبند آزمایشی الوریا",
        nameEn: "Eloria Test Necklace",

        descriptionFa:
          "محصول آزمایشی برای بررسی قیمت‌گذاری زنده، اجرت ساخت و هزینه کار هنری.",

        descriptionEn:
          "A test product for validating live pricing, making charges and artistic fees.",

        material: "GOLD",

        metalWeight: "3.250",

        purity: "طلای ۱۸ عیار",
        purityFineness: 750,

        pricingMode: "DYNAMIC",

        makingChargeType: "COMBINED",

        makingChargeFixed: "300000",

        makingChargePerGram: "450000",

        makingChargePercent: "5",

        artisticFee: "2000000",

        /*
         * null یعنی درصد سود و مالیات
         * از PricingPolicy خوانده شود.
         */
        profitPercent: null,
        taxPercent: null,

        currency: "TOMAN",

        legendFa:
          "در دل این اثر، روایتی از نور، طلا و نقش‌های فراموش‌شده ایران نهفته است.",

        legendEn:
          "Within this piece lies a story of light, gold and forgotten Persian motifs.",

        stock: 3,

        specifications: {
          collection: "necklaces",
          testProduct: true,
          handmade: true,
        },

        status: "ACTIVE",

        isFeatured: true,

        displayOrder: 1,
      },

      create: {
        collectionId: collection.id,

        slug: PRODUCT_SLUG,

        sku: "ELORIA-TEST-GOLD-001",

        nameFa: "گردنبند آزمایشی الوریا",
        nameEn: "Eloria Test Necklace",

        descriptionFa:
          "محصول آزمایشی برای بررسی قیمت‌گذاری زنده، اجرت ساخت و هزینه کار هنری.",

        descriptionEn:
          "A test product for validating live pricing, making charges and artistic fees.",

        material: "GOLD",

        metalWeight: "3.250",

        purity: "طلای ۱۸ عیار",
        purityFineness: 750,

        pricingMode: "DYNAMIC",

        price: null,
        compareAtPrice: null,

        makingChargeType: "COMBINED",

        makingChargeFixed: "300000",

        makingChargePerGram: "450000",

        makingChargePercent: "5",

        artisticFee: "2000000",

        profitPercent: null,
        taxPercent: null,

        currency: "TOMAN",

        legendFa:
          "در دل این اثر، روایتی از نور، طلا و نقش‌های فراموش‌شده ایران نهفته است.",

        legendEn:
          "Within this piece lies a story of light, gold and forgotten Persian motifs.",

        stock: 3,

        specifications: {
          collection: "necklaces",
          testProduct: true,
          handmade: true,
        },

        status: "ACTIVE",

        isFeatured: true,

        displayOrder: 1,
      },
    });

  await prisma.productImage.deleteMany({
    where: {
      productId: product.id,
    },
  });

  await prisma.productImage.create({
    data: {
      productId: product.id,

      imageUrl:
        "/images/collections/necklaces.jfif",

      altFa:
        "گردنبند آزمایشی الوریا",

      altEn:
        "Eloria test necklace",

      isPrimary: true,

      displayOrder: 1,
    },
  });

  console.log(
    JSON.stringify(
      {
        successful: true,

        product: {
          id: product.id,
          slug: product.slug,
          nameFa: product.nameFa,
          material: product.material,

          metalWeight:
            product.metalWeight?.toString() ??
            null,

          purity:
            product.purity,

          purityFineness:
            product.purityFineness,

          pricingMode:
            product.pricingMode,

          makingChargeType:
            product.makingChargeType,

          artisticFee:
            product.artisticFee.toString(),

          stock:
            product.stock,

          status:
            product.status,
        },

        apiPath:
          `/api/products/${product.slug}/price`,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error: unknown) => {
    console.error(
      "ساخت محصول آزمایشی ناموفق بود:",
      error,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });