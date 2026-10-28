import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import { getImageProps } from "next/image";
import { serveHeroImage, encodeHeroVariant } from "../src/lib/hero-image-response";
import { heroImageLoader, HERO_IMAGE_WIDTHS } from "../src/lib/hero-image-variants";
import { invalidatePublicMedia } from "../src/lib/public-media-cache";

async function main() {
  const pixels = Buffer.alloc(180 * 120 * 4);
  for (let y = 15; y < 105; y++) for (let x = 20; x < 160; x++) {
    // A ring, its transparent hole, and partially transparent edge pixels.
    if (x > 55 && x < 125 && y > 40 && y < 80) continue;
    pixels.set([x, y, 125, x === 20 ? 80 : 255], (y * 180 + x) * 4);
  }
  const png = await sharp(pixels, { raw: { width: 180, height: 120, channels: 4 } }).png().toBuffer();
  const id = randomUUID();
  let reads = 0;
  const load = async () => { reads++; return png; };
  const request = (query = "", headers?: HeadersInit) => new Request(`https://eloria.example/api/media/hero/${id}${query}`, { headers });
  const outputs = await Promise.all(Array.from({ length: 8 }, () => serveHeroImage(request("?w=640&format=webp"), id, load)));
  assert.ok(outputs.every(response => response.status === 200));
  assert.equal(reads, 1, "Concurrent visits must share one source read");
  const webp = Buffer.from(await outputs[0].arrayBuffer());
  assert.equal(outputs[0].headers.get("content-type"), "image/webp");
  const decoded = await sharp(webp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(decoded.info.width, 180, "Do not upscale uploaded photos");
  for (let i = 3; i < pixels.length; i += 4) assert.equal(decoded.data[i], pixels[i], "Preserve alpha, holes and translucent edges");
  const etag = outputs[0].headers.get("etag")!;
  const unchanged = await serveHeroImage(request("?w=640&format=webp", { "if-none-match": etag }), id, load);
  assert.equal(unchanged.status, 304);
  assert.equal((await unchanged.arrayBuffer()).byteLength, 0);
  assert.equal(reads, 1, "Warm images must not reread database bytes");
  const original = await serveHeroImage(request(), id, load);
  assert.deepEqual(Buffer.from(await original.arrayBuffer()), png, "Existing PNG URLs and uploads remain compatible");
  const forbiddenLoad = async (): Promise<never> => { throw new Error("must not load"); };
  assert.equal((await serveHeroImage(request(), "invalid", forbiddenLoad)).status, 404);
  for (const query of ["?w=99999&format=webp", "?w=641&format=webp", "?w=-1&format=webp", "?w=640", "?format=svg", "?format=webp"]) {
    const response = await serveHeroImage(request(query), id, forbiddenLoad);
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
  }
  const hidden = await serveHeroImage(request("?w=640&format=webp"), randomUUID(), async () => null);
  assert.equal(hidden.status, 404, "Hidden, removed or unavailable products must not become public");
  const failed = await serveHeroImage(request(), randomUUID(), async () => { throw new Error("offline"); });
  assert.equal(failed.status, 503);
  assert.equal(failed.headers.get("cache-control"), "no-store");
  invalidatePublicMedia();
  await serveHeroImage(request(), id, load);
  assert.equal(reads, 2, "Invalidation must discard original and responsive variants");

  const { props } = getImageProps({ src: `/api/media/hero/${id}`, alt: "hero", fill: true,
    sizes: "(max-width:520px) 92vw, 690px", loader: heroImageLoader });
  assert.ok(props.srcSet?.includes("format=webp"));
  assert.ok(!props.src?.includes("/_next/image"), "Avoid a second optimization proxy round trip");
  assert.ok(props.srcSet?.split(", ").every(candidate => {
    const url = new URL(candidate.split(" ")[0], "https://eloria.example");
    return HERO_IMAGE_WIDTHS.some(width => width === Number(url.searchParams.get("w")));
  }));

  if (process.argv[2]) {
    const real = await readFile(process.argv[2]);
    const report = [];
    for (const width of HERO_IMAGE_WIDTHS) {
      const start = performance.now();
      const variant = await encodeHeroVariant(real, width);
      const meta = await sharp(variant).metadata();
      assert.equal(meta.hasAlpha, true);
      assert.ok(variant.length < real.length / 2);
      report.push({ width: meta.width, height: meta.height, bytes: variant.length, encodeMs: Math.round(performance.now() - start) });
    }
    console.log(JSON.stringify({ originalBytes: real.length, variants: report }, null, 2));
  }
  console.log("PASS: alpha preservation, bounded responsive sizes, concurrent reads, caching, invalidation, 304, original fallback, private/missing/error handling.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
