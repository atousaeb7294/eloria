import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { calculateShipping } from "../src/lib/shipping";
import { ProductStructuredData } from "../src/components/product-detail/product-structured-data";

async function main() {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
    NEXT_PUBLIC_SITE_URL: "https://eloria.test",
  });
  // The application's JSX is compiled by Next; tsx uses the classic transform here.
  Object.assign(globalThis, { React });
  const markup = renderToStaticMarkup(React.createElement(ProductStructuredData, {
    locale: "fa", slug: "اثر / یک", name: "<Test>", description: "</script><script>bad</script>",
    images: ["/image.webp"], sku: "test", collectionSlug: null, collectionName: "Weave",
    finalPriceToman: "200000", stock: 1, purchasable: true, material: "Weave", weightGrams: null, purity: null,
  }));
  const schemas = [...markup.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(match => JSON.parse(match[1]));
  assert.equal(schemas.length, 2, "Customer content cannot break out of JSON-LD script tags");
  assert.equal(schemas[0].offers.shippingDetails.shippingRate.value, (BigInt(calculateShipping("200000").shippingToman) * 10n).toString());
  assert.equal(schemas[0].offers.shippingDetails.shippingRate.currency, "IRR");
  assert.equal(schemas[0].offers.price, "2000000");
  assert.equal(schemas[0].url, `https://eloria.test/fa/products/${encodeURIComponent("اثر / یک")}`);

  const { prisma } = await import("../src/lib/prisma");
  const stamp = new Date("2026-09-26T00:00:00.000Z");
  let productQuery: unknown;
  prisma.product.findMany = (async (query: unknown) => {
    productQuery = query;
    return [{ slug: "اثر / یک", updatedAt: stamp }];
  }) as unknown as typeof prisma.product.findMany;
  prisma.collection.findMany = (async () => { throw new Error("Legacy collection routes must not be queried"); }) as typeof prisma.collection.findMany;
  prisma.contentArticle.findMany = (async () => [{ slug: "wrist-size-guide", updatedAt: stamp }, { slug: "راهنمای بافت", updatedAt: stamp }]) as unknown as typeof prisma.contentArticle.findMany;
  const { default: sitemap } = await import("../src/app/sitemap");
  const entries = await sitemap();
  assert.deepEqual((productQuery as { where: unknown }).where, { status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true } });
  assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length);
  for (const locale of ["fa", "en"]) {
    assert.ok(entries.some(entry => entry.url === `https://eloria.test/${locale}/products/${encodeURIComponent("اثر / یک")}`));
    for (const treasury of ["gold", "silver", "weave"]) assert.ok(entries.some(entry => entry.url === `https://eloria.test/${locale}/collections/${treasury}`));
    assert.ok(entries.some(entry => entry.url === `https://eloria.test/${locale}/journal/wrist-size-guide`));
  }
  assert.ok(entries.every(entry => !new URL(entry.url).search));
  assert.ok(entries.filter(entry => entry.url.includes("/collections/")).every(entry => /\/collections\/(gold|silver|weave)$/.test(entry.url)));
  const productEntry = entries.find(entry => entry.url.includes("/fa/products/"));
  assert.equal(productEntry?.alternates?.languages?.en, `https://eloria.test/en/products/${encodeURIComponent("اثر / یک")}`);
  await prisma.$disconnect();
  console.log("PASS: actual shipping fee in IRR, safe JSON-LD, canonical sitemap routes, encoded slugs, deduplication and language alternates (mock catalog)");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
