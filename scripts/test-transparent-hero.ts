import assert from "node:assert/strict";
import sharp from "sharp";
import { prepareTransparentHero } from "../src/lib/transparent-hero";

async function main() {
  const rgba = Buffer.alloc(40 * 40 * 4);
  for (let y = 8; y < 32; y++) for (let x = 8; x < 32; x++) {
    if (x > 15 && x < 25 && y > 15 && y < 25) continue;
    rgba.set([126, 73, 180, 255], (y * 40 + x) * 4);
  }
  const source = await sharp(rgba, { raw: { width: 40, height: 40, channels: 4 } }).png().toBuffer();
  const output = await prepareTransparentHero(source);
  assert.ok(output, "A genuine transparent photo needs no model or worker");
  const pixels = await sharp(output).ensureAlpha().raw().toBuffer();
  assert.deepEqual(pixels, rgba, "Preserve source colors, thin edges and inner holes");
  const opaque = await sharp({ create: { width: 40, height: 40, channels: 4, background: { r: 30, g: 40, b: 50, alpha: 1 } } }).png().toBuffer();
  assert.equal(await prepareTransparentHero(opaque), null, "An opaque alpha channel is not a cutout");
  const empty = await sharp(Buffer.alloc(40 * 40 * 4), { raw: { width: 40, height: 40, channels: 4 } }).png().toBuffer();
  assert.equal(await prepareTransparentHero(empty), null, "Reject invisible output");
  await assert.rejects(prepareTransparentHero(Buffer.from("invalid")));
  console.log("PASS: transparent upload bypass, exact color/alpha preservation, opaque and empty rejection.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
