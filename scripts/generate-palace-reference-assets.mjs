import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Cropping/encoding only. The additions and open-chest states are ImageGen edits.
// No source artwork, environment files, database or remote service is modified.
const [desktop, mobile, mobileClosed, mobileOpen, desktopOpen, brazier] = process.argv.slice(2);
if (![desktop, mobile, mobileClosed, mobileOpen, desktopOpen, brazier].every(Boolean)) {
  throw new Error("Usage: node scripts/generate-palace-reference-assets.mjs desktop.jpg mobile.jpg mobile-plinths.png mobile-open.png desktop-open.png brazier.png");
}
const output = path.resolve("public/images/palace/reference");
await mkdir(output, { recursive: true });
const assets = {};

async function emit(name, input, widths, quality = 86) {
  const metadata = await sharp(input).metadata();
  const variants = [];
  for (const width of widths) {
    const bytes = await sharp(input).resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 6, alphaQuality: 95 }).toBuffer();
    const hash = createHash("sha256").update(bytes).digest("hex").slice(0, 10);
    const file = `${name}-${width}-${hash}.webp`;
    await writeFile(path.join(output, file), bytes);
    const info = await sharp(bytes).metadata();
    variants.push({ url: `/images/palace/reference/${file}`, width: info.width, height: info.height, bytes: bytes.length });
  }
  return { width: metadata.width, height: metadata.height, variants };
}

const desktopBytes = await readFile(desktop);
const mobileBytes = await readFile(mobile);
assets.desktop = await emit("palace", await sharp(desktopBytes)
  .extract({ left: 0, top: 0, width: 1126, height: 813 }).toBuffer(), [640, 1126], 88);
assets.featured = await emit("featured", await sharp(desktopBytes)
  .extract({ left: 0, top: 813, width: 1126, height: 584 }).toBuffer(), [900, 1126], 88);

const closed = await sharp(mobileClosed).resize(724, 1104, { fit: "fill" }).toBuffer();
const opened = await sharp(mobileOpen).resize(724, 1104, { fit: "fill" }).toBuffer();
const desktopOpened = await sharp(desktopOpen).resize(1126, 813, { fit: "fill" }).toBuffer();
assets.mobile = {};
assets.opened = {};
for (const [index, slug, top, rectangle] of [
  [0, "gold", 90, { left: 746, top: 292, width: 244, height: 201 }],
  [1, "silver", 496, { left: 451, top: 292, width: 233, height: 201 }],
  [2, "weave", 901, { left: 146, top: 292, width: 244, height: 201 }],
]) {
  const crop = { left: 0, top: index * 368, width: 724, height: 368 };
  assets.mobile[slug] = {
    closed: await emit(`${slug}-plinth`, await sharp(closed).extract(crop).toBuffer(), [360, 724]),
    open: await emit(`${slug}-open-mobile`, await sharp(opened).extract(crop).toBuffer(), [360, 724]),
    reference: await emit(`${slug}-reference`, await sharp(mobileBytes)
      .extract({ left: 14, top, width: 724, height: 368 }).toBuffer(), [360, 724], 88),
  };
  assets.opened[slug] = {
    ...await emit(`${slug}-open-desktop`, await sharp(desktopOpened).extract(rectangle).toBuffer(), [rectangle.width], 88),
    rectangle,
  };
}

assets.brazier = await emit("brazier", await sharp(brazier).resize({ width: 180 }).toBuffer(), [180], 86);
assets.products = [];
for (const [id, name, left, top] of [
  ["delbar", "دلبر", 25, 1371],
  ["silver-moon", "نقره ماه", 388, 1371],
  ["midnight", "مینا شب", 25, 1630],
  ["ancient", "کهن‌نشان", 388, 1630],
]) {
  assets.products.push({ id, name, image: await emit(id, await sharp(mobileBytes)
    .extract({ left, top, width: 337, height: 184 }).toBuffer(), [337], 88) });
}
assets.provenance = {
  desktopSha256: createHash("sha256").update(desktopBytes).digest("hex"),
  mobileSha256: createHash("sha256").update(mobileBytes).digest("hex"),
  note: "Original reference artwork retained. ImageGen supplies only the requested plinth/carpet, brazier and open-chest states.",
};
await writeFile("src/components/home-palace/palace-reference-assets.json", `${JSON.stringify(assets, null, 2)}\n`);
const bytes = (await Promise.all((await readdir(output)).map(async file =>
  (await stat(path.join(output, file))).size))).reduce((a, b) => a + b, 0);
console.log(`Prepared reference artwork: ${Math.round(bytes / 1024)} KiB across all viewport variants.`);
