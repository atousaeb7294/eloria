import { productAudience } from "../src/lib/product-audience";
import { prisma } from "../src/lib/prisma";
import {
  ELORIA_MYTH_LIBRARY,
  ELORIA_MEN_MYTH_LIBRARY,
  generateUnusedProductMyth,
} from "../src/lib/product-myth-generator";

async function main() {
  if (!process.argv.includes("--confirm-reassign")) {
    throw new Error(
      "برای جایگزینی افسانه‌های عمومی، گزینه --confirm-reassign الزامی است.",
    );
  }

  const products = await prisma.product.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, nameFa: true, nameEn: true, material: true, specifications: true },
  });

  if (products.filter(p => productAudience(p.specifications) === "WOMEN").length > ELORIA_MYTH_LIBRARY.length || products.filter(p => productAudience(p.specifications) === "MEN").length > ELORIA_MEN_MYTH_LIBRARY.length) {
    throw new Error(
      `تعداد محصولات (${products.length}) از تعداد افسانه‌های مجاز (${ELORIA_MYTH_LIBRARY.length}) بیشتر است؛ برای جلوگیری از تکرار هیچ تغییری انجام نشد.`,
    );
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.product.updateMany({ data: { mythKey: null } });
    const used = new Set<string>();

    for (const product of products) {
      const myth = generateUnusedProductMyth(
        {
          nameFa: product.nameFa,
          nameEn: product.nameEn,
          audience: productAudience(product.specifications), material: product.material,
        },
        used,
      );
      await transaction.product.update({
        where: { id: product.id },
        data: {
          mythKey: myth.mythKey,
          mythNameFa: myth.mythNameFa,
          mythNameEn: myth.mythNameEn,
          legendFa: myth.legendFa,
          legendEn: myth.legendEn,
        },
      });
      used.add(myth.mythKey);
    }
  });

  console.log(
    `Reassigned ${products.length} products to ${products.length} unique canonical legends in their audience pools.`,
  );
}

main().finally(() => prisma.$disconnect());

