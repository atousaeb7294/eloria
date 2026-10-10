/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated executable doubles, never production services. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { createSingleFlight, BusyError } from "../src/lib/single-flight";
import { readPublicMedia } from "../src/lib/public-media-cache";
import { mountIntroWatchdog } from "../src/lib/intro-watchdog";
import { productionEnvironmentChecks } from "../src/lib/env-validation";

async function main() {
  const run = createSingleFlight(1);
  let release!: (n: number) => void;
  let calls = 0;
  const first = run("a", () => { calls++; return new Promise<number>(r => { release = r; }); });
  assert.equal(first, run("a", async () => 99));
  await assert.rejects(run("b", async () => 2), BusyError);
  await Promise.resolve(); release(1);
  assert.equal(await first, 1); assert.equal(calls, 1);
  assert.equal(await run("a", async () => 3), 3, "settled values are not cached");
  await assert.rejects(run("a", async () => { throw Error("database failed"); }));
  assert.equal(await run("a", async () => 4), 4, "failure releases capacity");

  let imageReads = 0;
  const loadImage = async () => { imageReads++; return { bytes: new Uint8Array(2 * 1024 * 1024), contentType: "image/webp" }; };
  await readPublicMedia("first", loadImage);
  await readPublicMedia("first", loadImage);
  assert.equal(imageReads, 1);
  for (let i=0; i<9; i++) await readPublicMedia(`image-${i}`, loadImage);
  await readPublicMedia("first", loadImage);
  assert.equal(imageReads, 11, "byte budget evicts older public images");

  let now = 0, stalls = 0, hidden = false;
  const video = { currentTime: 0 };
  const tick = mountIntroWatchdog(video, () => stalls++, { now: () => now, hidden: () => hidden });
  now = 11000; tick(); assert.equal(stalls, 0);
  video.currentTime = 1; tick(); now = 20000; tick(); assert.equal(stalls, 0);
  hidden = true; now = 60000; tick(); hidden = false;
  now = 71000; tick(); assert.equal(stalls, 0);
  now = 72000; tick(); tick(); assert.equal(stalls, 1);

  // Execute catalog production code with fake DB reads; ensure post-update reads
  // observe new prices, rather than validating implementation strings.
  const require = createRequire(import.meta.url);
  let price = "100000", queries = 0;
  const product = () => ({ slug: "weave", pricingMode: "MANUAL", currency: "TOMAN", manualPrice: price });
  const source = ts.transpileModule(readFileSync("src/lib/priced-catalog.ts", "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  const mod = { exports: {} as any };
  const dependencies: Record<string, unknown> = {
    "@/lib/commerce-policy": { PACKAGING_TOMAN: 70000n },
    "@/lib/catalog": { getCatalogPricingPage: async () => { queries++; return { candidates: [product()], total: 1, page: 1, pageSize: 24, pageCount: 1 }; } },
    "@/lib/catalog-pagination": { normalizeCatalogPage: (n: number) => n || 1 },
    "@/lib/metal-rate-freshness": {}, "@/lib/metal-rate-sale-policy": {}, "@/lib/pricing-engine": {},
    "@/lib/single-flight": { createSingleFlight },
    "@/lib/prisma": { prisma: { pricingPolicy: { findMany: async () => [] }, metalPrice: { findMany: async () => [] } }, withDatabaseRetry: (fn: () => unknown) => fn() },
  };
  runInNewContext(source, { module: mod, exports: mod.exports, require: (name: string) => name in dependencies ? dependencies[name] : require(name), console });
  const p1 = mod.exports.getPricedProductsCatalog({});
  const p2 = mod.exports.getPricedProductsCatalog({});
  assert.equal((await p1).products[0].displayPriceToman, "170000"); await p2;
  assert.equal(queries, 1);
  price = "200000";
  assert.equal((await mod.exports.getPricedProductsCatalog({})).products[0].displayPriceToman, "270000");
  assert.equal(queries, 2);

  const before = process.env.DATABASE_SSL_MODE;
  process.env.DATABASE_SSL_MODE = "require";
  assert.equal(productionEnvironmentChecks().find(c => c.key === "DATABASE_SSL_MODE")?.valid, false);
  process.env.DATABASE_SSL_MODE = "verify-full";
  assert.equal(productionEnvironmentChecks().find(c => c.key === "DATABASE_SSL_MODE")?.valid, true);
  if (before === undefined) delete process.env.DATABASE_SSL_MODE; else process.env.DATABASE_SSL_MODE = before;
  console.log("PASS: quote admission/deduplication/recovery, fresh catalog after updates, intro progress/hidden-tab/stall recovery, verified TLS contract");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
