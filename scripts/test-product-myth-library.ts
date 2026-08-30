import assert from "node:assert/strict";
import { ELORIA_MYTH_LIBRARY, generateUnusedProductMyth } from "../src/lib/product-myth-generator";

assert.equal(ELORIA_MYTH_LIBRARY.length, 100);
assert.equal(new Set(ELORIA_MYTH_LIBRARY.map(item => item.mythKey)).size, 100);
assert.equal(new Set(ELORIA_MYTH_LIBRARY.map(item => item.mythNameFa)).size, 100);
assert.equal(new Set(ELORIA_MYTH_LIBRARY.map(item => item.legendFa)).size, 100);
assert.ok(ELORIA_MYTH_LIBRARY.every(item => /^[آ-ی‌]+$/.test(item.mythNameFa)));

const used = new Set<string>();
for (let index = 0; index < 100; index += 1) {
  const myth = generateUnusedProductMyth({ nameFa: `اثر ${index}`, nameEn: `Creation ${index}` }, used);
  assert.ok(!used.has(myth.mythKey));
  used.add(myth.mythKey);
}
assert.equal(used.size, 100);
assert.throws(
  () => generateUnusedProductMyth({ nameFa: "اثر صد و یکم" }, used),
  /ELORIA_MYTH_LIBRARY_EXHAUSTED/,
);

console.log("PASS  100 unique Persian names and one-time Eloria myths");
