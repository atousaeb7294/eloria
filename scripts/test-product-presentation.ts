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
    Object.assign(fixture, {
      hasGold: true, hasSilver: true, goldComponentWeight: "2", silverComponentWeight: "3.25",
      purityFineness: 750, metalWeight: null, artisticFee: "500000",
    });
    prisma.pricingPolicy.findFirst = (async () => ({
      defaultProfitPercent: "0", defaultTaxPercent: "0", roundingStep: 1, quoteTtlSeconds: 120,
      staleAfterMinutes: 15, closedMarketPricingEnabled: false, closedMarketMaxAgeMinutes: 0,
      closedMarketSafetyMarginPercent: "0",
    })) as unknown as typeof originalPolicy;
    prisma.metalPrice.findUnique = (async ({ where }: { where: { material: string } }) => ({
      pricePerGram: where.material === "GOLD" ? "10000000" : "100000",
      referencePurity: where.material === "GOLD" ? 750 : 999,
      sourceTimeUnix: BigInt(Math.floor(Date.now() / 1000)), lastSuccessAt: new Date(),
      rawPayload: { pricingBasis: "ELORIA_SILVER_10_31_V2" },
    })) as unknown as typeof originalRate;
    for (const material of ["GOLD", "SILVER"]) {
      fixture.material = material;
      const mixed = await getProductLivePrice({ slug: fixture.slug });
      assert.equal(mixed.product.weightGrams, "5.250");
      assert.equal(mixed.pricing.finalPriceToman, "23895000");
      assert.equal(mixed.pricing.breakdown?.components?.length, 2);
      fixture.metalWeight = "2"; // Older records may retain only the primary weight.
    }
  } finally {
    prisma.product.findFirst = originalProduct;
    prisma.pricingPolicy.findFirst = originalPolicy;
    prisma.metalPrice.findUnique = originalRate;
    await prisma.$disconnect();
  }
  console.log("PASS: explicit weave/mixed composition, Persian OTP, manual weave quote independent of metal rates, invalid dynamic composition");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
