import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { getProductsCatalog } from "../src/lib/catalog";

async function main() {
  const whereCalls: unknown[] = [];
  let collectionLookups = 0;
  const count = prisma.product.count;
  const findMany = prisma.product.findMany;
  const collection = prisma.collection.findFirst;
  // Mock only persistence, exercising the actual query builder without a database.
  prisma.product.count = (async (args: { where: unknown }) => { whereCalls.push(args.where); return 0; }) as unknown as typeof count;
  prisma.product.findMany = (async (args: { where: unknown }) => { whereCalls.push(args.where); return []; }) as unknown as typeof findMany;
  prisma.collection.findFirst = (async () => { collectionLookups++; return { id: "test-collection", slug: "bracelets" }; }) as unknown as typeof collection;
  try {
    await getProductsCatalog({ collectionSlug: "men", material: "SILVER", availability: "AVAILABLE" });
    assert.equal(collectionLookups, 0, "Virtual men’s collection must not require a DB collection row");
    for (const where of whereCalls) {
      assert.deepEqual(where, { status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true }, specifications: { path: ["eloriaAudience"], equals: "MEN" }, material: "SILVER", AND: [{ status: "ACTIVE", stock: { gt: 0 } }] });
    }
    whereCalls.length = 0;
    await getProductsCatalog({ collectionSlug: "bracelets" });
    assert.equal(collectionLookups, 1);
    for (const where of whereCalls) {
      assert.deepEqual(where, { status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true }, collectionId: "test-collection" });
    }
    console.log("PASS: actual catalog query isolates men and preserves regular collections, stock and metal filters.");
  } finally {
    prisma.product.count = count; prisma.product.findMany = findMany; prisma.collection.findFirst = collection;
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
