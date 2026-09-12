import { productAudience } from "../src/lib/product-audience";
import { prisma } from "../src/lib/prisma";
import { getProductMythByKey } from "../src/lib/product-myth-generator";

async function main() {
  if (!process.argv.includes("--confirm-overwrite")) {
    throw new Error("برای بازنویسی روایت‌های فعلی، گزینه --confirm-overwrite الزامی است.");
  }
  const products = await prisma.product.findMany({
    where: { mythKey: { not: null } },
    select: { id: true, nameFa: true, nameEn: true, material: true, specifications: true, mythKey: true },
  });
  let refreshed = 0;
  for (const product of products) {
    if (!product.mythKey) continue;
    const myth = getProductMythByKey(product.mythKey, { ...product, audience: productAudience(product.specifications) });
    if (!myth) continue;
    await prisma.product.update({
      where: { id: product.id },
      data: {
        mythNameFa: myth.mythNameFa,
        mythNameEn: myth.mythNameEn,
        legendFa: myth.legendFa,
        legendEn: myth.legendEn,
      },
    });
    refreshed += 1;
  }
  console.log(`Refreshed ${refreshed} product legends without changing myth assignments.`);
}

main().finally(() => prisma.$disconnect());
