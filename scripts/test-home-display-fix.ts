import assert from "node:assert/strict";
import { loadHomeDesign, type HomeDesignSource, type HomeProduct, type HomeAppearance } from "../src/lib/home-design-data";

const rows: HomeProduct[] = Array.from({ length: 12 }, (_, i) => ({
  id: `p${i}`, slug: `piece-${i}`, nameFa: `اثر ${i}`, nameEn: `Piece ${i}`,
  hasGold: i % 3 === 0, hasSilver: i % 3 === 1, status: "ACTIVE",
  collection: { isActive: true }, images: [{ id: `image-${i}`, imageUrl: `/original-${i}.jpg` }],
}));
const source = (overrides: Partial<HomeDesignSource> = {}): HomeDesignSource => ({
  appearance: async () => null,
  products: async ({ ids, excludeIds, take }) => rows.filter(p => (!ids || ids.includes(p.id)) && !excludeIds?.includes(p.id)).slice(0, take),
  cutouts: async () => [], report: () => {}, ...overrides,
});
async function main() {
  const missingTable = await loadHomeDesign("fa", source({ appearance: async () => { throw new Error("missing appearance table"); } }));
  assert.equal(missingTable.pieces.length, 8);
  assert.equal(missingTable.hero?.imageUrl, rows[0].images[0].imageUrl);
  assert.equal(missingTable.unavailable, false);
  const config: HomeAppearance = { featuredProductIds: ["p7", "p3", "p1"], featuredCutoutIds: ["cutout"], heroScale: 200, heroCutout: { id: "hero", product: rows[3] } };
  const brokenOptionalMedia = await loadHomeDesign("fa", source({ appearance: async () => config, cutouts: async () => { throw new Error("cutout unavailable"); } }));
  assert.deepEqual(brokenOptionalMedia.pieces.slice(0, 3).map(p => p.id), ["p7", "p3", "p1"]);
  assert.equal(brokenOptionalMedia.pieces.length, 8);
  assert.equal(new Set(brokenOptionalMedia.pieces.map(p => p.id)).size, 8);
  assert.equal(brokenOptionalMedia.hero?.id, "p3");
  assert.equal(brokenOptionalMedia.hero?.scale, 100);
  const stale = await loadHomeDesign("en", source({ appearance: async () => config, cutouts: async () => [{ id: "old", productId: "p7", sourceImageId: "old-image", sourceImageUrl: "/old.jpg" }] }));
  assert.equal(stale.pieces[0].cutoutUrl, undefined);
  assert.equal(stale.pieces[0].name, "Piece 7");
  const privateHero = await loadHomeDesign("fa", source({ appearance: async () => ({ ...config, heroCutout: { id: "draft", product: { ...rows[9], status: "DRAFT" } } }) }));
  assert.notEqual(privateHero.hero?.id, "p9");
  const partial = await loadHomeDesign("fa", source({ appearance: async () => config, products: async ({ ids }) => { if (!ids) throw new Error("temporary failure"); return [rows[7]]; } }));
  assert.equal(partial.pieces.length, 1, "Failed top-up must preserve the available selection");
  const empty = await loadHomeDesign("fa", source({ products: async () => [] }));
  assert.equal(empty.hero, null);
  const down = await loadHomeDesign("fa", source({ products: async () => { throw new Error("offline"); } }));
  assert.equal(down.unavailable, true);
  assert.deepEqual(down.pieces, []);
  assert.equal(brokenOptionalMedia.hero?.cutoutUrl, "/api/media/hero/hero");
  assert.equal(brokenOptionalMedia.pieces[0].imageId, "image-7");
  const retiredHero = await loadHomeDesign("fa", source({ appearance: async () => ({ ...config, heroCutout: { id: "hidden", product: { ...rows[9], collection: { isActive: false } } } }) }));
  assert.equal(retiredHero.hero?.id, "p7", "A hidden selected product must fall back to the public catalog");
  assert.equal(retiredHero.hero?.cutoutUrl, undefined, "Never expose the retired product cutout");
  console.log("PASS: catalog survives optional failures; selected photo and order; private hero fallback; automatic image preparation IDs.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
