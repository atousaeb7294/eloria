import sharp from "sharp";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

// Versioned, pre-encoded public assets avoid cold runtime image transformations.
const sources = [
  ...Array.from({ length: 9 }, (_, i) => `/images/section-backgrounds/bg-0${i + 1}.webp`),
  ...Array.from({ length: 8 }, (_, i) => `/images/section-backgrounds/mobile/bg-0${i + 1}.jpg`),
  "/images/treasuries/gold-macrame-v2.webp", "/images/treasuries/silver.webp", "/images/treasuries/weave.webp",
];
await mkdir("public/images/responsive", { recursive: true });
const manifest = {};
let originalBytes = 0, compactBytes = 0;
for (const src of sources) {
  const input = await readFile(`public${src}`);
  const metadata = await sharp(input).metadata();
  const widths = [...new Set([384, 640, 960, 1280, 1920].map(w => Math.min(w, metadata.width)))].sort((a, b) => a - b);
  const variants = [];
  for (const width of widths) {
    const bytes = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: 78, effort: 5 }).toBuffer();
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 16);
    const url = `/images/responsive/${hash}-${width}.webp`;
    await writeFile(`public${url}`, bytes);
    variants.push({ width, url });
    if (width === Math.min(640, metadata.width)) compactBytes += bytes.length;
  }
  originalBytes += input.length;
  manifest[src] = variants;
}
await writeFile("src/lib/static-backdrop-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(JSON.stringify({ sources: sources.length, originalBytes, compact640Bytes: compactBytes }));
