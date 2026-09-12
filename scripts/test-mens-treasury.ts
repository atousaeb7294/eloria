import assert from "node:assert/strict";
import { ELORIA_MYTH_LIBRARY, ELORIA_MEN_MYTH_LIBRARY, generateUnusedProductMyth, getProductMythByKey, generateProductMyth } from "../src/lib/product-myth-generator";
import { ELORIA_GUARDIANS } from "../src/lib/eloria-mythology";
import { productAudience, withProductAudience } from "../src/lib/product-audience";
import { canonicalProductStory } from "../src/lib/canonical-product-story";
assert.equal(ELORIA_MYTH_LIBRARY.length, 20);
assert.equal(ELORIA_MEN_MYTH_LIBRARY.length, 19);
const all = [...ELORIA_MYTH_LIBRARY, ...ELORIA_MEN_MYTH_LIBRARY];
assert.equal(new Set(all.map(m => m.mythKey)).size, 39);
assert.equal(new Set(all.map(m => m.mythNameFa)).size, 39);
assert.equal(ELORIA_GUARDIANS.find(g => g.id === "vista")?.domainFa, "زندگی");
assert.equal(ELORIA_GUARDIANS.find(g => g.id === "athena")?.domainFa, "خرد");
for (const audience of ["MEN", "WOMEN"] as const) {
  const pool = audience === "MEN" ? ELORIA_MEN_MYTH_LIBRARY : ELORIA_MYTH_LIBRARY;
  const opposite = audience === "MEN" ? "WOMEN" : "MEN";
  const used = new Set<string>();
  for (let index = 0; index < pool.length; index++) {
    const myth = generateUnusedProductMyth({ nameFa: `اثر ${index}`, audience }, used);
    assert.ok(pool.some(m => m.mythKey === myth.mythKey));
    assert.ok(!used.has(myth.mythKey));
    assert.equal(getProductMythByKey(myth.mythKey, { nameFa: "اثر", audience: opposite }), null);
    assert.ok(myth.legendFa.length > 15 && myth.legendEn.length > 15);
    used.add(myth.mythKey);
  }
  assert.throws(() => generateUnusedProductMyth({ nameFa: "تمام شد", audience }, used), /EXHAUSTED/);
}
assert.equal(productAudience(null), "WOMEN");
assert.equal(productAudience({ eloriaAudience: "MEN" }), "MEN");
assert.equal(productAudience({ name: "مردانه" }), "WOMEN");
const specs = { size: "18", stone: "turquoise", nested: { certificate: true } };
assert.deepEqual(withProductAudience(specs, "MEN"), { ...specs, eloriaAudience: "MEN" });
assert.deepEqual(specs, { size: "18", stone: "turquoise", nested: { certificate: true } });
assert.throws(() => withProductAudience(["legacy"], "MEN"));
const renamed = canonicalProductStory({ nameFa: "انگشتر", nameEn: "Ring", material: "SILVER", specifications: {}, mythKey: "character-06-01", mythNameFa: "فرنوش", mythNameEn: "Farnoosh", legendFa: "روایت اختصاصی فرنوش حفظ شود.", legendEn: "Farnoosh's authored story." });
assert.equal(renamed.mythNameFa, "کاساندان");
assert.equal(renamed.legendFa, "روایت اختصاصی کاساندان حفظ شود.");
assert.ok(ELORIA_MEN_MYTH_LIBRARY.some(m => m.mythNameFa === "اردوان" && m.worldProfile.age === 60));
assert.ok(ELORIA_MEN_MYTH_LIBRARY.some(m => m.mythNameFa === "داریوش"));
assert.deepEqual(generateProductMyth({ nameFa: "اثر" }), generateProductMyth({ nameFa: "اثر", audience: "WOMEN" }));
console.log("PASS: 39 unique legends, strict audience isolation, pool exhaustion, renamed guardians and preservation of authored text/specifications.");
