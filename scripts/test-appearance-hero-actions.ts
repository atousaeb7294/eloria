/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated server-action doubles; no database. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";

async function main() {
  const require = createRequire(import.meta.url);
  let authenticated = false, writes = 0, preparations = 0;
  let candidates: any[] = [];
  const productId = "10000000-0000-4000-8000-000000000001";
  const imageId = "20000000-0000-4000-8000-000000000001";
  const version = new Date("2026-10-26T00:00:00Z");
  let lastData: any;
  class HeroPreparationError extends Error {}
  const tx = {
    storefrontAppearance: {
      findUnique: async () => ({ updatedAt: version }),
      upsert: async (data: any) => { writes++; lastData = data; return { updatedAt: version }; },
    },
    heroCutout: { findMany: async () => candidates },
  };
  const mod = { exports: {} as any };
  const code = ts.transpileModule(readFileSync("src/app/[locale]/admin/(protected)/appearance/actions.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    module: mod, exports: mod.exports, console,
    require: (name: string) => {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name.endsWith("/admin-auth")) return { hasValidAdminSession: async () => authenticated };
      if (name.endsWith("/prisma")) return { prisma: { $transaction: async (fn: any) => fn(tx) } };
      if (name.endsWith("/hero-cutout")) return {
        HeroPreparationError,
        prepareHeroCutout: async (p: string, i: string) => {
          assert.equal(p, productId); assert.equal(i, imageId); preparations++;
          return { id: "prepared", imageUrl: "/api/media/hero/prepared" };
        },
      };
      if (name.endsWith("/home-design-contract")) return require("../src/lib/home-design-contract.ts");
      return require(name);
    },
  });
  const input = { productId, imageId, scale: 90, expectedVersion: version.toISOString() };
  const save = mod.exports.saveHomeHeroOnlyAction;
  assert.equal((await save(input)).ok, false);
  assert.equal(preparations + writes, 0, "Unauthenticated callers cannot process images or save settings");
  authenticated = true;
  assert.equal((await save({ ...input, scale: 101 })).ok, false);
  assert.equal((await save({ ...input, mode: "invalid" })).ok, false);
  assert.equal((await save({ ...input, expectedVersion: null })).ok, false);
  assert.equal(writes, 0, "Stale editors cannot overwrite published settings");
  assert.equal((await save(input)).ok, true);
  assert.equal(lastData.update.heroCutoutId, "prepared");
  const random = { ...input, mode: "random", productId: "", imageId: "" };
  const before = preparations;
  assert.equal((await save(random)).ok, false, "Random mode requires a current prepared photo");
  candidates = [{ sourceImageId: imageId, sourceImageUrl: "/old.png", product: { images: [{ id: imageId, imageUrl: "/current.png" }] } }];
  assert.equal((await save(random)).ok, false, "Stale photos do not qualify for random mode");
  candidates[0].sourceImageUrl = "/current.png";
  assert.equal((await save(random)).ok, true);
  assert.equal(lastData.update.heroCutoutId, null);
  assert.equal(preparations, before, "Changing display mode must not run image inference");
  console.log("PASS: admin authentication, validation, stale-editor protection, fixed/random saves and no random-mode inference.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
