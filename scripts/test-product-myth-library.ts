import assert from "node:assert/strict";
import {
  ELORIA_MYTH_LIBRARY,
  generateUnusedProductMyth,
} from "../src/lib/product-myth-generator";

assert.equal(ELORIA_MYTH_LIBRARY.length, 20);
assert.equal(
  new Set(ELORIA_MYTH_LIBRARY.map((item) => item.mythKey)).size,
  20,
);
assert.equal(
  new Set(ELORIA_MYTH_LIBRARY.map((item) => item.mythNameFa)).size,
  20,
);
assert.equal(
  new Set(ELORIA_MYTH_LIBRARY.map((item) => item.legendFa)).size,
  20,
);
assert.ok(
  ELORIA_MYTH_LIBRARY.every((item) =>
    /^[آ-ی‌\s\u064B-\u0652]+$/.test(item.mythNameFa),
  ),
);

const used = new Set<string>();
for (let index = 0; index < 20; index += 1) {
  const myth = generateUnusedProductMyth(
    { nameFa: `اثر ${index}`, nameEn: `Creation ${index}` },
    used,
  );
  assert.ok(!used.has(myth.mythKey));
  used.add(myth.mythKey);
}
assert.equal(used.size, 20);
assert.throws(
  () => generateUnusedProductMyth({ nameFa: "اثر بیست‌ویکم" }, used),
  /ELORIA_MYTH_LIBRARY_EXHAUSTED/,
);

console.log("PASS  20 canonical young/middle-aged women and one-time Eloria myths");
