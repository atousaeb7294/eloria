import assert from "node:assert/strict";
import sharp from "sharp";

async function main() {
  process.env.ELORIA_MEDIA_STORAGE = "database";
  process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:5432/test";
  const { prisma } = await import("../src/lib/prisma");
  const { storeProductImage } = await import("../src/lib/product-media-storage");
  let captured: { bytes: Uint8Array; contentType: string } | undefined;
  const getCaptured = () => { assert.ok(captured); return captured; };
  const original = prisma.productMediaAsset.create;
  prisma.productMediaAsset.create = (async ({ data }: { data: typeof captured }) => {
    captured = data; return { id: "image-test" };
  }) as unknown as typeof original;
  try {
    for (const format of ["jpeg", "png", "webp"] as const) {
      const input = await sharp({ create: { width: 3000, height: 1500, channels: 4,
        background: { r: 160, g: 120, b: 60, alpha: 0.5 } } })[format]().toBuffer();
      await storeProductImage("image-test", new File([new Uint8Array(input)], `input.${format}`, { type: `image/${format}` }));
      const stored = getCaptured();
      const metadata = await sharp(stored.bytes).metadata();
      assert.equal(stored.contentType, "image/webp");
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, 2000); assert.equal(metadata.height, 1000);
      if (format !== "jpeg") assert.equal(metadata.hasAlpha, true);
      assert.ok(stored.bytes.length < input.length, "these large fixtures should shrink");
    }
    const small = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#abc" } }).png().toBuffer();
    await storeProductImage("image-test", new File([new Uint8Array(small)], "small.png", { type: "image/png" }));
    assert.equal((await sharp(getCaptured().bytes).metadata()).width, 40);
    await assert.rejects(() => storeProductImage("image-test", new File(["fake"], "fake.png", { type: "image/png" })));
    console.log("PASS: WebP conversion, 2000px limit, aspect ratio, transparency, no upscaling, fixture compression and invalid file rejection.");
  } finally { prisma.productMediaAsset.create = original; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
