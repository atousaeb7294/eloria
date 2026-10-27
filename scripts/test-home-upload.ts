/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated database doubles; no database connection. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import sharp from "sharp";
import ts from "typescript";
import { normalizeUploadedHero } from "../src/lib/home-hero-upload";
import { loadHomeDesign, type HomeProduct } from "../src/lib/home-design-data";
import { UPLOADED_HERO_VERSION, MAX_HERO_BYTES } from "../src/lib/home-design-contract";

async function main() {
  const raw = Buffer.alloc(64 * 64 * 4);
  for (let y = 16; y < 48; y++) for (let x = 16; x < 48; x++) {
    const i = (y * 64 + x) * 4;
    raw[i] = 46; raw[i + 1] = 138; raw[i + 2] = 82; raw[i + 3] = 255;
  }
  const png = await sharp(raw, { raw: { width: 64, height: 64, channels: 4 } }).png().toBuffer();
  const webp = await sharp(png).webp({ lossless: true }).toBuffer();
  for (const input of [png, webp]) {
    const result = await normalizeUploadedHero(input);
    assert.equal(result.width, 64); assert.equal(result.height, 64);
    assert.deepEqual(await sharp(result.bytes).raw().toBuffer(), raw, "Transparency and product pixels must be preserved");
  }
  const opaque = await sharp(png).flatten({ background: "white" }).png().toBuffer();
  const jpg = await sharp(opaque).jpeg().toBuffer();
  for (const input of [opaque, jpg, Buffer.from("bad"), Buffer.alloc(0), Buffer.alloc(MAX_HERO_BYTES + 1)])
    await assert.rejects(normalizeUploadedHero(input));

  const productId = "10000000-0000-4000-8000-000000000001";
  const imageId = "20000000-0000-4000-8000-000000000001";
  const assetId = "30000000-0000-4000-8000-000000000001";
  const version = new Date("2026-10-27T00:00:00Z");
  let authenticated = false, writes = 0, preparations = 0, hidden = false, failWrite = false;
  let lastAppearance: any, lastAsset: any, archived: any;
  class HeroPreparationError extends Error {}
  const tx = {
    storefrontAppearance: {
      findUnique: async () => ({ updatedAt: version, heroCutoutId: assetId }),
      upsert: async (data: any) => { writes++; lastAppearance = data; return { updatedAt: version }; },
      update: async (data: any) => { writes++; lastAppearance = data; return { updatedAt: version }; },
    },
    product: { findFirst: async () => hidden ? null : { images: [{ id: imageId, imageUrl: "/original.jpg" }] } },
    heroCutout: {
      upsert: async (data: any) => { if (failWrite) throw new Error("database unavailable"); lastAsset = data; return { id: assetId }; },
      findFirst: async (query: any) => { assert.equal(query.where.pipelineVersion, UPLOADED_HERO_VERSION); return hidden ? null : { id: assetId }; },
      update: async (data: any) => { archived = data; return { id: assetId }; },
    },
  };
  const require = createRequire(import.meta.url);
  const mod = { exports: {} as any };
  const code = ts.transpileModule(readFileSync("src/app/[locale]/admin/(protected)/appearance/actions.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(code, {
    module: mod, exports: mod.exports, console, Buffer, File, FormData, Uint8Array,
    require: (name: string) => {
      if (name === "next/cache") return { revalidatePath() {} };
      if (name.endsWith("/admin-auth")) return { hasValidAdminSession: async () => authenticated };
      if (name.endsWith("/prisma")) return { prisma: { $transaction: async (fn: any) => fn(tx) } };
      if (name.endsWith("/hero-cutout")) return { HeroPreparationError, prepareHeroCutout: async () => { preparations++; throw new Error("No inference for an upload"); } };
      if (name.endsWith("/home-hero-upload")) return { normalizeUploadedHero };
      if (name.endsWith("/home-design-contract")) return require("../src/lib/home-design-contract.ts");
      return require(name);
    },
  });
  const form = (bytes = png, expected = version.toISOString()) => {
    const data = new FormData();
    data.set("image", new File([new Uint8Array(bytes)], "transparent.png", { type: "image/png" }));
    data.set("productId", productId); data.set("scale", "90"); data.set("expectedVersion", expected);
    return data;
  };
  const { uploadHomeHeroAction: upload, saveHomeHeroOnlyAction: save, removeUploadedHomeHeroAction: remove } = mod.exports;
  assert.equal((await upload(form())).ok, false); assert.equal(writes, 0);
  authenticated = true;
  assert.equal((await upload(form(png, "stale"))).ok, false); assert.equal(writes, 0);
  assert.equal((await upload(form(opaque))).ok, false); assert.equal(writes, 0);
  hidden = true; assert.equal((await upload(form())).ok, false); assert.equal(writes, 0); hidden = false;
  failWrite = true; assert.equal((await upload(form())).ok, false); assert.equal(writes, 0); failWrite = false;
  const result = await upload(form());
  assert.equal(result.ok, true); assert.equal(result.imageUrl, `/api/media/hero/${assetId}`);
  assert.equal(lastAsset.create.pipelineVersion, UPLOADED_HERO_VERSION);
  assert.deepEqual([...lastAsset.create.bytes], [...(await normalizeUploadedHero(png)).bytes]);
  assert.deepEqual(Object.keys(lastAppearance.update).sort(), ["heroCutoutId", "heroScale"]);
  const manual = { mode: "upload", cutoutId: assetId, productId, imageId, scale: 80, expectedVersion: version.toISOString() };
  assert.equal((await save(manual)).ok, true); assert.equal(preparations, 0);
  const beforeRemove = writes;
  assert.equal((await remove({ id: assetId, expectedVersion: "stale" })).ok, false); assert.equal(writes, beforeRemove);
  assert.equal((await remove({ id: assetId, expectedVersion: version.toISOString() })).ok, true);
  assert.equal(archived.data.pipelineVersion, `removed-upload-${assetId}`);
  assert.equal(lastAppearance.data.heroCutoutId, null);
  authenticated = false; assert.equal((await remove({ id: assetId, expectedVersion: version.toISOString() })).ok, false);

  const product: HomeProduct = { id: productId, slug: "sample", nameFa: "نمونه", nameEn: "Sample", hasGold: true, hasSilver: false,
    status: "ACTIVE", collection: { isActive: true }, images: [{ id: "new-gallery-image", imageUrl: "/changed.jpg" }] };
  const source = {
    appearance: async () => ({ heroScale: 90, featuredProductIds: [], featuredCutoutIds: [], heroCutout: {
      id: assetId, pipelineVersion: UPLOADED_HERO_VERSION, sourceImageId: imageId, sourceImageUrl: "/old.jpg", product,
    } }), products: async () => [product], cutouts: async () => [], report() {},
  };
  assert.equal((await loadHomeDesign("fa", source)).hero?.cutoutUrl, `/api/media/hero/${assetId}`, "Gallery updates must not replace the admin's uploaded photo");
  product.status = "DRAFT";
  assert.equal((await loadHomeDesign("fa", source)).hero, null, "Hidden products never become a public hero");
  console.log("PASS: transparent pixels, PNG/WebP validation, auth, version conflicts, private products, safe save failures, direct upload, size update, removal and gallery independence.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
