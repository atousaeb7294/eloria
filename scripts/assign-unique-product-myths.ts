import { productAudience } from "../src/lib/product-audience";
import { prisma } from "../src/lib/prisma";
import { generateUnusedProductMyth } from "../src/lib/product-myth-generator";

async function main() {
  const products = await prisma.product.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true, nameFa: true, nameEn: true, material: true, specifications: true, mythKey: true },
  });
  const used = new Set(products.flatMap(product => product.mythKey ? [product.mythKey] : []));
  let assigned = 0;

  for (const product of products) {
    if (product.mythKey) continue;
    const myth = generateUnusedProductMyth(
      { nameFa: product.nameFa, nameEn: product.nameEn, audience: productAudience(product.specifications), material: product.material },
      used,
    );
    await prisma.product.update({
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
    assigned += 1;
  }

  console.log(`Assigned ${assigned} unique Eloria myths. ${used.size}/39 slots are now used.`);
}

main().finally(() => prisma.$disconnect());
