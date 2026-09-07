import { databasePool, prisma } from "../src/lib/prisma";

async function main() {
  const products = await prisma.product.findMany({
    where: { variants: { some: { isActive: true } } },
    select: {
      id: true,
      slug: true,
      stock: true,
      variants: { where: { isActive: true }, select: { stock: true } },
    },
  });
  const mismatches = products.filter(product => {
    const expected = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
    return expected !== product.stock;
  });
  if (mismatches.length) {
    for (const product of mismatches) {
      console.error(`MISMATCH ${product.slug}: product=${product.stock}, variants=${product.variants.reduce((sum, variant) => sum + variant.stock, 0)}`);
    }
    process.exitCode = 1;
  } else {
    console.log("PASS  Inventory consistency");
  }
}

main().finally(async () => {
  await prisma.$disconnect();
  await databasePool.end();
});
