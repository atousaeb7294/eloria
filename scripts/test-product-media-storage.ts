import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { testProductMediaMutations } from "./test-product-media-mutations";

async function main() {
  Object.assign(process.env, {
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://test:test@127.0.0.1:5432/test",
    ELORIA_MEDIA_STORAGE: "auto",
    SUPABASE_URL: "https://unavailable.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
    ELORIA_STORAGE_BUCKET: "products",
  });
  const { prisma } = await import("../src/lib/prisma");
  const {
    storeProductImage,
    removeStoredProductImage,
    ProductMediaStorageError,
  } = await import("../src/lib/product-media-storage");
  const { GET } = await import("../src/app/api/media/products/[id]/route");
  const id = "438ef02d-933c-47c7-a469-6628983cc05c";
  let saved: { bytes: Uint8Array; contentType: string } | undefined;
  let writes = 0;
  prisma.productMediaAsset.create = (async ({
    data,
  }: {
    data: typeof saved;
  }) => {
    writes++;
    saved = data;
    return { id };
  }) as unknown as typeof prisma.productMediaAsset.create;
  prisma.productMediaAsset.findUnique = (async () =>
    saved ?? null) as unknown as typeof prisma.productMediaAsset.findUnique;
  prisma.productMediaAsset.deleteMany = (async () => {
    saved = undefined;
    return { count: 1 };
  }) as typeof prisma.productMediaAsset.deleteMany;
  const bytes = await sharp({
    create: { width: 40, height: 40, channels: 3, background: "#123456" },
  })
    .png()
    .toBuffer();
  const file = () =>
    new File([new Uint8Array(bytes)], "sample.png", { type: "image/png" });
  const originalFetch = globalThis.fetch;
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = () => {};
  console.warn = () => {};
  try {
    globalThis.fetch = async () => {
      throw new TypeError("fetch failed", { cause: { code: "ENOTFOUND" } });
    };
    const url = await storeProductImage(id, file());
    assert.equal(url, `/api/media/products/${id}`);
    assert.equal(
      writes,
      1,
      "DNS failure must persist a validated image durably",
    );
    const response = await GET(new Request(`https://eloria.test${url}`), {
      params: Promise.resolve({ id }),
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "image/webp");
    assert.equal(
      (await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width,
      40,
    );
    assert.equal(
      (
        await GET(new Request("https://eloria.test"), {
          params: Promise.resolve({ id: "../secret" }),
        })
      ).status,
      404,
    );
    await removeStoredProductImage(url);
    assert.equal(
      (
        await GET(new Request("https://eloria.test"), {
          params: Promise.resolve({ id }),
        })
      ).status,
      404,
    );

    globalThis.fetch = async () => new Response("denied", { status: 403 });
    await assert.rejects(
      () => storeProductImage(id, file()),
      ProductMediaStorageError,
    );
    assert.equal(
      writes,
      1,
      "Permission failures must not be hidden by a fallback",
    );
    globalThis.fetch = async (input, init) => {
      assert.match(
        String(input),
        /\/products\/[a-z0-9-]+\/\d+-[a-z0-9-]+\.webp$/,
      );
      assert.equal(
        new Headers(init?.headers).get("content-type"),
        "image/webp",
      );
      assert.equal(
        (await sharp(Buffer.from(init?.body as Uint8Array)).metadata()).format,
        "webp",
      );
      return new Response("ok", { status: 200 });
    };
    assert.match(
      await storeProductImage(id, file()),
      /^https:\/\/unavailable.supabase.co\/storage\/v1\/object\/public\//,
    );
    assert.equal(writes, 1);

    process.env.ELORIA_MEDIA_STORAGE = "database";
    globalThis.fetch = async () => {
      throw new Error("Database mode must not call external storage");
    };
    assert.equal(await storeProductImage(id, file()), url);
    assert.equal(writes, 2);
    await assert.rejects(
      () =>
        storeProductImage(
          id,
          new File(["<script>alert(1)</script>"], "fake.png", {
            type: "image/png",
          }),
        ),
      ProductMediaStorageError,
    );
    assert.equal(writes, 2, "Invalid bytes must never be stored");
    process.env.ELORIA_MEDIA_STORAGE = "supabase";
    await assert.rejects(
      () => storeProductImage(id, file()),
      ProductMediaStorageError,
    );
    assert.equal(writes, 2, "Explicit Supabase mode must not change providers");

    process.env.ELORIA_MEDIA_STORAGE = "database";
    async function convert(input: Buffer, type: string) {
      await storeProductImage(
        id,
        new File([new Uint8Array(input)], "untrusted-name.jpg", { type }),
      );
      assert.ok(saved);
      assert.equal(saved.contentType, "image/webp");
      const output = Buffer.from(saved.bytes);
      const metadata = await sharp(output).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(
        metadata.exif,
        undefined,
        "EXIF including GPS must not be retained",
      );
      assert.equal(metadata.icc, undefined);
      assert.equal(metadata.xmp, undefined);
      assert.equal(metadata.orientation, undefined);
      assert.ok(output.length <= 8 * 1024 * 1024);
      return { output, metadata };
    }
    // Actual image decoding/re-encoding, with persistence mocked only at its boundary.
    const jpeg = await sharp({
      create: { width: 60, height: 30, channels: 3, background: "#aabbcc" },
    })
      .withMetadata({ orientation: 6 })
      .withExifMerge({ IFD0: { Artist: "private-upload-metadata" } })
      .jpeg()
      .toBuffer();
    assert.ok((await sharp(jpeg).metadata()).exif);
    const rotated = await convert(jpeg, "image/jpeg");
    assert.equal(rotated.metadata.width, 30);
    assert.equal(rotated.metadata.height, 60);

    const transparent = await sharp({
      create: {
        width: 30,
        height: 20,
        channels: 4,
        background: { r: 200, g: 40, b: 70, alpha: 0.5 },
      },
    })
      .png()
      .toBuffer();
    const alpha = await convert(transparent, "image/png");
    assert.equal(alpha.metadata.hasAlpha, true);
    assert.equal(alpha.metadata.width, 30, "Small images must not be enlarged");
    const inputAlpha = await sharp(transparent)
      .extractChannel("alpha")
      .raw()
      .toBuffer();
    const outputAlpha = await sharp(alpha.output)
      .extractChannel("alpha")
      .raw()
      .toBuffer();
    assert.deepEqual(
      outputAlpha,
      inputAlpha,
      "Transparency must survive conversion exactly",
    );
    const webp = await sharp(transparent).webp().toBuffer();
    assert.equal((await convert(webp, "image/webp")).metadata.hasAlpha, true);

    const pixels = Buffer.alloc(3200 * 1600 * 3);
    for (let y = 0; y < 1600; y++) {
      for (let x = 0; x < 3200; x++) {
        const offset = (y * 3200 + x) * 3;
        pixels[offset] = Math.floor(x / 16) % 256;
        pixels[offset + 1] = Math.floor(y / 8) % 256;
        pixels[offset + 2] = (x + y) % 256;
      }
    }
    const largePng = await sharp(pixels, {
      raw: { width: 3200, height: 1600, channels: 3 },
    })
      .png()
      .toBuffer();
    const resized = await convert(largePng, "image/png");
    assert.equal(resized.metadata.width, 2560);
    assert.equal(
      resized.metadata.height,
      1280,
      "Resize must preserve aspect ratio",
    );
    assert.ok(
      resized.output.length < largePng.length,
      "Representative large PNG must shrink",
    );

    const beforeInvalid = writes;
    const invalid = (input: Buffer, type = "image/png") =>
      assert.rejects(
        () =>
          storeProductImage(
            id,
            new File([new Uint8Array(input)], "sample.png", { type }),
          ),
        ProductMediaStorageError,
      );
    await invalid(bytes, "image/jpeg");
    await invalid(Buffer.alloc(0));
    await invalid(Buffer.alloc(8 * 1024 * 1024 + 1));
    await invalid(bytes.subarray(0, 20));
    await invalid(
      await sharp({
        create: { width: 12001, height: 1, channels: 3, background: "white" },
      })
        .png()
        .toBuffer(),
    );
    await invalid(
      await sharp({
        create: { width: 6400, height: 6400, channels: 3, background: "white" },
      })
        .png()
        .toBuffer(),
    );
    await assert.rejects(
      () => storeProductImage("../another-product", file()),
      ProductMediaStorageError,
    );

    const frames = Buffer.concat([
      Buffer.alloc(4 * 4 * 3, 0),
      Buffer.alloc(4 * 4 * 3, 255),
    ]);
    const animated = await sharp(frames, {
      raw: { width: 4, height: 8, channels: 3, pageHeight: 4 },
    })
      .webp({ loop: 0, delay: [100, 100] })
      .toBuffer();
    assert.equal((await sharp(animated).metadata()).pages, 2);
    await assert.rejects(
      () =>
        storeProductImage(
          id,
          new File([new Uint8Array(animated)], "animated.webp", {
            type: "image/webp",
          }),
        ),
      /تصویر متحرک/,
    );
    // APNG's animation control chunk must also be caught when libvips treats it as PNG.
    const animationChunk = Buffer.from(
      "000000086163544c0000000200000000f38d9370",
      "hex",
    );
    const apng = Buffer.concat([
      bytes.subarray(0, 33),
      animationChunk,
      bytes.subarray(33),
    ]);
    await assert.rejects(
      () =>
        storeProductImage(
          id,
          new File([new Uint8Array(apng)], "animated.png", {
            type: "image/png",
          }),
        ),
      /تصویر متحرک/,
    );
    assert.equal(
      writes,
      beforeInvalid,
      "Rejected files and IDs must never reach persistence",
    );

    const previousCwd = process.cwd();
    const temporaryRoot = await mkdtemp(path.join(previousCwd, ".media-test-"));
    try {
      process.chdir(temporaryRoot);
      process.env.ELORIA_MEDIA_STORAGE = "local";
      const localUrl = await storeProductImage(id, file());
      assert.match(
        localUrl,
        new RegExp(`^/uploads/products/${id}/\\d+-[a-f0-9-]+\\.webp$`),
      );
      const storedPath = path.join(temporaryRoot, "public", localUrl);
      assert.equal(
        (await sharp(await readFile(storedPath)).metadata()).format,
        "webp",
      );
      const unrelated = path.join(path.dirname(storedPath), "notes.txt");
      await writeFile(unrelated, "leave this file alone");
      await removeStoredProductImage(`/uploads/products/${id}/notes.txt`);
      assert.equal(await readFile(unrelated, "utf8"), "leave this file alone");
      await removeStoredProductImage(localUrl);
      await assert.rejects(() => readFile(storedPath), { code: "ENOENT" });
    } finally {
      process.chdir(previousCwd);
      await rm(temporaryRoot, { recursive: true, force: true });
    }
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    console.warn = originalWarn;
    await prisma.$disconnect();
  }
  await testProductMediaMutations();
  console.log(
    "PASS: WebP conversion, orientation, alpha, resizing, metadata removal, rejection limits/animation/paths, local/Supabase/database persistence, fallback and public read/delete",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
