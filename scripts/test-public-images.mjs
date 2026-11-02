import { readdir } from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import sharp from "sharp";

const files = (await readdir("public", { recursive: true })).filter(name => /\.(?:png|jpe?g|webp|gif|avif|svg)$/i.test(name));
for (const file of files) {
  const metadata = await sharp(path.join("public", file)).metadata();
  await sharp(path.join("public", file)).resize({ width: 32, height: 32, fit: "inside", withoutEnlargement: true }).toBuffer();
  assert.ok(metadata.width > 0 && metadata.height > 0, `Invalid image dimensions: ${file}`);
}
console.log(`PASS: all ${files.length} bundled public image files decode successfully and have valid dimensions.`);
