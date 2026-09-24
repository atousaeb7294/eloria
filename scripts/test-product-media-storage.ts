import assert from "node:assert/strict";
import sharp from "sharp";

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
    assert.equal(response.headers.get("content-type"), "image/png");
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
    globalThis.fetch = async () => new Response("ok", { status: 200 });
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
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalError;
    console.warn = originalWarn;
    await prisma.$disconnect();
  }
  console.log(
    "PASS: media DNS fallback, public read/delete, input validation, permissions and explicit providers (mock persistence)",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
