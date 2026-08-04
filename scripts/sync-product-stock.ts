import { prisma } from "@/lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    where: { variants: { some: {} } },
    select: {
      id: true,
      slug: true,
      status: true,
      variants: {
        where: { isActive: true },
        select: { stock: true },
      },
    },
  });

  let updated = 0;

  for (const product of products) {
    const stock = product.variants.reduce((total, variant) => total + variant.stock, 0);
    const status =
      product.status === "DRAFT" || product.status === "ARCHIVED"
        ? product.status
        : stock > 0
          ? "ACTIVE"
          : "OUT_OF_STOCK";

    await prisma.product.update({
      where: { id: product.id },
      data: { stock, status },
    });

    updated += 1;
    console.log(`${product.slug}: stock=${stock}, status=${status}`);
  }

  console.log(`Synced ${updated} products with variants.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
