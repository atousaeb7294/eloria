import assert from "node:assert/strict";
import sharp from "sharp";
import { calculateEloriaCompositeJewelryPrice } from "../src/lib/pricing-engine";
async function main() {
  // Isolate this mocked test from any configured production database.
  process.env.DATABASE_URL = "postgresql://test:test@127.0.0.1:5432/test";
  const { storeProductImage, removeStoredProductImage } = await import("../src/lib/product-media-storage");
  const originalFetch = globalThis.fetch;
  const original = {
    NODE_ENV: process.env.NODE_ENV,
    ELORIA_MEDIA_STORAGE: process.env.ELORIA_MEDIA_STORAGE,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ELORIA_STORAGE_BUCKET: process.env.ELORIA_STORAGE_BUCKET,
  };
  const bytes = await sharp({
    create: { width: 3, height: 3, channels: 3, background: "#073121" },
  })
    .jpeg()
    .toBuffer();
  const file = new File([new Uint8Array(bytes)], "test.jpg", {
    type: "image/jpeg",
  });
  let calls = 0;
  try {
    Object.assign(process.env, {
      NODE_ENV: "production",
      ELORIA_MEDIA_STORAGE: "supabase",
      SUPABASE_URL: "",
      SUPABASE_SERVICE_ROLE_KEY: "",
      ELORIA_STORAGE_BUCKET: "",
    });
    globalThis.fetch = async () => {
      calls++;
      throw new Error("Unexpected network request");
    };
    await assert.rejects(
      () => storeProductImage("test", file),
      /SUPABASE_URL/,
    );
    assert.equal(calls, 0);
    Object.assign(process.env, {
      SUPABASE_URL: "https://storage.example",
      SUPABASE_SERVICE_ROLE_KEY: "sb_secret_test",
      ELORIA_STORAGE_BUCKET: "images",
    });
    await assert.rejects(
      () =>
        storeProductImage(
          "test",
          new File(["<svg/>"], "bad.jpg", { type: "image/jpeg" }),
        ),
      /محتوای فایل/,
    );
    await assert.rejects(
      () =>
        storeProductImage(
          "test",
          new File([new Uint8Array(8 * 1024 * 1024 + 1)], "large.jpg"),
        ),
      /۸ مگابایت/,
    );
    globalThis.fetch = async (_input, init) => {
      calls++;
      assert.equal(
        (init?.headers as Record<string, string>).apikey,
        "sb_secret_test",
      );
      assert.equal(
        (init?.headers as Record<string, string>).Authorization,
        undefined,
      );
      return new Response("{}", { status: 200 });
    };
    const url = await storeProductImage("test", file);
    assert.match(
      url,
      /^https:\/\/storage\.example\/storage\/v1\/object\/public\/images\/products\/test\//,
    );
    await removeStoredProductImage(url);
    const before = calls;
    await removeStoredProductImage(
      "https://storage.example/storage/v1/object/public/images/products/test/../../secret",
    );
    assert.equal(calls, before);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(original)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
  const price = calculateEloriaCompositeJewelryPrice({
    primaryMaterial: "SILVER",
    metals: [
      {
        material: "GOLD",
        weightGrams: "2",
        productPurity: 750,
        referencePurity: 750,
        referencePricePerGramToman: "10000000",
      },
      {
        material: "SILVER",
        weightGrams: "3.25",
        productPurity: 999,
        referencePurity: 999,
        referencePricePerGramToman: "100000",
      },
    ],
    artisticFeeToman: "500000",
  });
  const gold = price.components!.find((part) => part.material === "GOLD")!;
  assert.equal(Number(gold.makingChargePercent), 8);
  assert.equal(Number(gold.profitPercent), 7);
  assert.equal(price.finalPriceToman, "23895000");
  assert.equal(price.packagingToman, "70000");
  console.log(
    "PASS: real image decode/re-encode, upload contract, size/type limits, missing storage, deletion path guard, displayed gold percentages and unchanged total. Remote storage/DB not used.",
  );
}
void main();
