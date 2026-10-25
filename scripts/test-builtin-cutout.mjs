import assert from "node:assert/strict";
import sharp from "sharp";
import { composeCutout, prepare } from "../services/cutout/node-worker.mjs";

const width = 100, height = 100;
const source = Buffer.alloc(width * height * 4);
const mask = Buffer.alloc(width * height);
for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
  const i = y * width + x, radius = Math.hypot(x - 50, y - 50);
  source.set([25, 115, 180, 255], i * 4);
  if ((radius >= 20 && radius < 32) || (x >= 80 && x <= 92 && y === 50)) mask[i] = 255;
}
mask[101] = 255; // isolated background noise
const output = await composeCutout(source, width, height, mask);
const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
assert.equal(info.width, info.height);
assert.equal(info.channels, 4);
assert.equal(data[(Math.floor(info.height / 2) * info.width + Math.floor(info.width / 2)) * 4 + 3], 0, "Bracelet hole stays transparent");
let foreground = 0;
for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
  const i = (y * info.width + x) * 4;
  if (data[i + 3] > 200) {
    foreground++;
    assert.deepEqual([...data.subarray(i, i + 3)], [25, 115, 180], "Original RGB is preserved");
    assert.ok(Math.hypot(x + .5 - info.width / 2, y + .5 - info.height / 2) < info.width * .49, "No product pixels clipped by the circular frame");
  }
}
assert.equal(foreground, mask.filter(value => value > 200).length - 1, "Thin connected cord survives; isolated speck removed");
await assert.rejects(composeCutout(source, width, height, Buffer.alloc(width * height)), /UNCERTAIN_MASK/);
await assert.rejects(composeCutout(source, width, height, Buffer.alloc(width * height, 255)), /UNCERTAIN_MASK/);
const alreadyTransparent = await prepare(output, "/missing-model");
assert.ok((await sharp(alreadyTransparent).metadata()).hasAlpha, "Existing PNG transparency requires no model or remote service");
const opaque = await sharp(source, { raw: { width, height, channels: 4 } }).png().toBuffer();
await assert.rejects(prepare(opaque, "/missing-model"), /MODEL_MISSING/);
await assert.rejects(prepare(Buffer.alloc(8 * 1024 * 1024 + 1)), /INVALID_IMAGE/);
await assert.rejects(prepare(Buffer.from("not an image")));
console.log("PASS: alpha/RGB preservation, circular fit, inner hole, thin cords, specks, transparent uploads and bounded/invalid inputs.");
