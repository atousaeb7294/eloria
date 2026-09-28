import assert from "node:assert/strict";
import { productMaterialKind, productMaterialLabel } from "../src/lib/product-material";
import { normalizeOtpInput } from "../src/lib/otp-input";
import { PACKAGING_TOMAN } from "../src/lib/commerce-policy";

async function main() {
  assert.equal(productMaterialKind({ material: "GOLD", hasGold: false, hasSilver: false }), "WEAVE");
  assert.equal(productMaterialLabel({ material: "GOLD", hasGold: false, hasSilver: false }, "fa"), "بافت بدون فلز");
  assert.equal(productMaterialKind({ material: "GOLD", hasGold: false, hasSilver: true }), "SILVER");
  assert.equal(productMaterialKind({ material: "SILVER", hasGold: true, hasSilver: true }), "MIXED");
  assert.equal(productMaterialKind({ material: "GOLD", metalComponents: { hasGold: false, hasSilver: false } }), "WEAVE");
  assert.equal(productMaterialKind({ material: "SILVER" }), "SILVER");
  assert.equal(normalizeOtpInput("۰١۲٣۴۵"), "012345");

  process.env.DATABASE_URL ??= "postgresql://test:test@127.0.0.1:5432/eloria";
  const { prisma } = await import("../src/lib/prisma");
  const { getProductLivePrice, ProductPricingError } = await import("../src/lib/product-pricing-core");
  const originalProduct = prisma.product.findFirst;
  const originalPolicy = prisma.pricingPolicy.findFirst;
  const originalRate = prisma.metalPrice.findUnique;
  const fixture = {
    id: "weave", slug: "weave", sku: null, nameFa: "بافت", nameEn: "Weave",
    material: "GOLD", hasGold: false, hasSilver: false,
    metalWeight: "0.625", purity: null, purityFineness: null,
    goldComponentWeight: null, silverComponentWeight: null,
    pricingMode: "MANUAL", currency: "TOMAN", price: 500000n,
    status: "ACTIVE", stock: 2, variants: [], images: [],
  };
  prisma.product.findFirst = (async () => fixture) as unknown as typeof originalProduct;
  prisma.pricingPolicy.findFirst = (() => { throw new Error("Manual weave must not load metal policy"); }) as typeof originalPolicy;
  prisma.metalPrice.findUnique = (() => { throw new Error("Manual weave must not load metal rate"); }) as typeof originalRate;
  try {
    const quote = await getProductLivePrice({ slug: "weave" });
    assert.equal(quote.pricing.finalPriceToman, (500000n + PACKAGING_TOMAN).toString());
    assert.equal(quote.liveRate, null);
    assert.equal(quote.product.weightGrams, "0.625");
    assert.equal(productMaterialKind(quote.product), "WEAVE");
    assert.equal(quote.product.isPurchasable, true);
    fixture.pricingMode = "DYNAMIC";
    await assert.rejects(getProductLivePrice({ slug: "weave" }), (error: unknown) =>
      error instanceof ProductPricingError && error.code === "INVALID_PRODUCT_COMPOSITION");
  } finally {
    prisma.product.findFirst = originalProduct;
    prisma.pricingPolicy.findFirst = originalPolicy;
    prisma.metalPrice.findUnique = originalRate;
    await prisma.$disconnect();
  }
  console.log("PASS: explicit weave/mixed composition, Persian OTP, manual weave quote independent of metal rates, invalid dynamic composition");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
