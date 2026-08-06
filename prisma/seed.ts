import { createHash } from "node:crypto";

import { databasePool, prisma } from "../src/lib/prisma";

const COLLECTIONS = [
  {
    id: "10000000-0000-4000-8000-000000000001",
    slug: "necklaces",
    nameFa: "گردنبند",
    nameEn: "Necklaces",
    descriptionFa: "روایت‌هایی آویخته از طلا، نقره، اصالت و افسانه",
    descriptionEn: "Stories suspended in gold, silver, heritage and legend",
    imageUrl: "/images/collections/necklaces.jfif",
    displayOrder: 10,
  },
  {
    id: "10000000-0000-4000-8000-000000000002",
    slug: "bracelets",
    nameFa: "دستبند",
    nameEn: "Bracelets",
    descriptionFa: "نقش‌هایی از شکوه، ظرافت و میراث ماندگار الوریا",
    descriptionEn: "Symbols of elegance, grace and enduring Eloria heritage",
    imageUrl: "/images/collections/bracelet.jpg",
    displayOrder: 20,
  },
  {
    id: "10000000-0000-4000-8000-000000000003",
    slug: "earrings",
    nameFa: "گوشواره",
    nameEn: "Earrings",
    descriptionFa: "درخشش‌هایی الهام‌گرفته از جهان اسرارآمیز الوریا",
    descriptionEn: "Radiance inspired by the mysterious world of Eloria",
    imageUrl: "/images/collections/earring.jpg",
    displayOrder: 30,
  },
] as const;

const PRODUCTS = [
  {
    id: "20000000-0000-4000-8000-000000000001",
    collectionSlug: "necklaces",
    slug: "mehr-necklace",
    sku: "EL-N-001",
    nameFa: "گردنبند مهر",
    nameEn: "Mehr Necklace",
    material: "GOLD" as const,
    metalWeight: "3.250",
    purity: "۱۸ عیار",
    purityFineness: 750,
    makingChargeType: "PERCENT" as const,
    makingChargePercent: "12.000",
    artisticFee: "650000",
    stock: 7,
    displayOrder: 10,
    imageUrl: "/images/collections/necklaces.jfif",
  },
  {
    id: "20000000-0000-4000-8000-000000000002",
    collectionSlug: "necklaces",
    slug: "simorgh-necklace",
    sku: "EL-N-002",
    nameFa: "گردنبند سیمرغ",
    nameEn: "Simorgh Necklace",
    material: "SILVER" as const,
    metalWeight: "12.400",
    purity: "نقره ۹۲۵",
    purityFineness: 925,
    makingChargeType: "FIXED" as const,
    makingChargeFixed: "1800000",
    artisticFee: "900000",
    stock: 4,
    displayOrder: 20,
    imageUrl: "/images/collections/necklaces.jfif",
  },
  {
    id: "20000000-0000-4000-8000-000000000003",
    collectionSlug: "bracelets",
    slug: "lotus-bracelet",
    sku: "EL-B-001",
    nameFa: "دستبند لوتوس",
    nameEn: "Lotus Bracelet",
    material: "GOLD" as const,
    metalWeight: "4.100",
    purity: "۱۸ عیار",
    purityFineness: 750,
    makingChargeType: "PER_GRAM" as const,
    makingChargePerGram: "420000",
    artisticFee: "550000",
    stock: 6,
    displayOrder: 10,
    imageUrl: "/images/collections/bracelet.jpg",
  },
  {
    id: "20000000-0000-4000-8000-000000000004",
    collectionSlug: "bracelets",
    slug: "shahnameh-bracelet",
    sku: "EL-B-002",
    nameFa: "دستبند شاهنامه",
    nameEn: "Shahnameh Bracelet",
    material: "SILVER" as const,
    metalWeight: "18.800",
    purity: "نقره ۹۲۵",
    purityFineness: 925,
    makingChargeType: "COMBINED" as const,
    makingChargeFixed: "900000",
    makingChargePercent: "8.000",
    artisticFee: "1250000",
    stock: 0,
    displayOrder: 20,
    imageUrl: "/images/collections/bracelet.jpg",
  },
  {
    id: "20000000-0000-4000-8000-000000000005",
    collectionSlug: "earrings",
    slug: "anahita-earrings",
    sku: "EL-E-001",
    nameFa: "گوشواره آناهیتا",
    nameEn: "Anahita Earrings",
    material: "GOLD" as const,
    metalWeight: "2.750",
    purity: "۱۸ عیار",
    purityFineness: 750,
    makingChargeType: "PERCENT" as const,
    makingChargePercent: "14.000",
    artisticFee: "500000",
    stock: 8,
    displayOrder: 10,
    imageUrl: "/images/collections/earring.jpg",
  },
  {
    id: "20000000-0000-4000-8000-000000000006",
    collectionSlug: "earrings",
    slug: "persian-star-earrings",
    sku: "EL-E-002",
    nameFa: "گوشواره ستاره پارسی",
    nameEn: "Persian Star Earrings",
    material: "SILVER" as const,
    metalWeight: "8.600",
    purity: "نقره ۹۲۵",
    purityFineness: 925,
    makingChargeType: "FIXED" as const,
    makingChargeFixed: "1250000",
    artisticFee: "600000",
    stock: 5,
    displayOrder: 20,
    imageUrl: "/images/collections/earring.jpg",
  },
] as const;

async function seed() {
  const now = new Date();
  const sourceTimeUnix = BigInt(Math.floor(now.getTime() / 1000));

  for (const collection of COLLECTIONS) {
    await prisma.collection.upsert({
      where: { slug: collection.slug },
      create: { ...collection, isActive: true },
      update: {
        nameFa: collection.nameFa,
        nameEn: collection.nameEn,
        descriptionFa: collection.descriptionFa,
        descriptionEn: collection.descriptionEn,
        imageUrl: collection.imageUrl,
        displayOrder: collection.displayOrder,
        isActive: true,
      },
    });
  }

  const collections = await prisma.collection.findMany({
    select: { id: true, slug: true },
  });
  const collectionIds = new Map(collections.map(item => [item.slug, item.id]));

  for (const product of PRODUCTS) {
    const collectionId = collectionIds.get(product.collectionSlug);
    if (!collectionId) throw new Error(`Missing seeded collection: ${product.collectionSlug}`);

    const saved = await prisma.product.upsert({
      where: { slug: product.slug },
      create: {
        id: product.id,
        collectionId,
        slug: product.slug,
        sku: product.sku,
        nameFa: product.nameFa,
        nameEn: product.nameEn,
        descriptionFa: `اثر آزمایشی ${product.nameFa} برای محیط توسعه و تست الوریا.`,
        descriptionEn: `${product.nameEn} development and test fixture for Eloria.`,
        material: product.material,
        metalWeight: product.metalWeight,
        purity: product.purity,
        purityFineness: product.purityFineness,
        pricingMode: "DYNAMIC",
        makingChargeType: product.makingChargeType,
        makingChargeFixed: "makingChargeFixed" in product ? product.makingChargeFixed : "0",
        makingChargePerGram: "makingChargePerGram" in product ? product.makingChargePerGram : "0",
        makingChargePercent: "makingChargePercent" in product ? product.makingChargePercent : "0",
        artisticFee: product.artisticFee,
        stock: product.stock,
        status: product.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
        isFeatured: product.displayOrder === 10,
        displayOrder: product.displayOrder,
      },
      update: {
        collectionId,
        sku: product.sku,
        nameFa: product.nameFa,
        nameEn: product.nameEn,
        material: product.material,
        metalWeight: product.metalWeight,
        purity: product.purity,
        purityFineness: product.purityFineness,
        pricingMode: "DYNAMIC",
        makingChargeType: product.makingChargeType,
        makingChargeFixed: "makingChargeFixed" in product ? product.makingChargeFixed : "0",
        makingChargePerGram: "makingChargePerGram" in product ? product.makingChargePerGram : "0",
        makingChargePercent: "makingChargePercent" in product ? product.makingChargePercent : "0",
        artisticFee: product.artisticFee,
        stock: product.stock,
        status: product.stock > 0 ? "ACTIVE" : "OUT_OF_STOCK",
        displayOrder: product.displayOrder,
      },
    });

    await prisma.productImage.deleteMany({ where: { productId: saved.id } });
    await prisma.productImage.create({
      data: {
        id: product.id.replace(/^2/, "3"),
        productId: saved.id,
        imageUrl: product.imageUrl,
        altFa: product.nameFa,
        altEn: product.nameEn,
        isPrimary: true,
        displayOrder: 0,
      },
    });
  }

  const policies = [
    {
      id: "40000000-0000-4000-8000-000000000001",
      material: "GOLD" as const,
      referencePurity: 750,
      defaultProfitPercent: "7.000",
      defaultTaxPercent: "10.000",
      taxMetalValue: false,
      quoteTtlSeconds: 120,
      staleAfterMinutes: 15,
      closedMarketPricingEnabled: true,
      closedMarketMaxAgeMinutes: 14400,
      closedMarketSafetyMarginPercent: "3.000",
      roundingStep: 1000,
    },
    {
      id: "40000000-0000-4000-8000-000000000002",
      material: "SILVER" as const,
      referencePurity: 999,
      defaultProfitPercent: "12.000",
      defaultTaxPercent: "10.000",
      taxMetalValue: true,
      quoteTtlSeconds: 120,
      staleAfterMinutes: 30,
      closedMarketPricingEnabled: true,
      closedMarketMaxAgeMinutes: 14400,
      closedMarketSafetyMarginPercent: "5.000",
      roundingStep: 1000,
    },
  ];

  for (const policy of policies) {
    await prisma.pricingPolicy.upsert({
      where: { material: policy.material },
      create: { ...policy, isActive: true },
      update: { ...policy, isActive: true },
    });
  }

  const prices = [
    {
      id: "50000000-0000-4000-8000-000000000001",
      material: "GOLD" as const,
      pricePerGram: "6500000",
      referencePurity: 750,
      sourceSymbol: "TEST_GOLD_18K",
    },
    {
      id: "50000000-0000-4000-8000-000000000002",
      material: "SILVER" as const,
      pricePerGram: "115000",
      referencePurity: 999,
      sourceSymbol: "TEST_SILVER_999",
    },
  ];

  for (const price of prices) {
    const saved = await prisma.metalPrice.upsert({
      where: { material: price.material },
      create: {
        ...price,
        source: "ELORIA_TEST_SEED",
        sourceUnit: "toman/gram",
        sourceDate: now.toISOString().slice(0, 10),
        sourceTime: now.toISOString().slice(11, 19),
        sourceTimeUnix,
        fetchedAt: now,
        lastSuccessAt: now,
        rawPayload: { fixture: true },
      },
      update: {
        pricePerGram: price.pricePerGram,
        referencePurity: price.referencePurity,
        source: "ELORIA_TEST_SEED",
        sourceSymbol: price.sourceSymbol,
        sourceUnit: "toman/gram",
        sourceDate: now.toISOString().slice(0, 10),
        sourceTime: now.toISOString().slice(11, 19),
        sourceTimeUnix,
        fetchedAt: now,
        lastSuccessAt: now,
        lastError: null,
        rawPayload: { fixture: true },
      },
    });

    const fingerprint = createHash("sha256")
      .update(`${saved.material}:${saved.pricePerGram}:${sourceTimeUnix}`)
      .digest("hex");

    await prisma.metalPriceHistory.upsert({
      where: { fingerprint },
      create: {
        metalPriceId: saved.id,
        material: saved.material,
        pricePerGram: saved.pricePerGram,
        referencePurity: saved.referencePurity,
        source: saved.source,
        sourceSymbol: saved.sourceSymbol,
        sourceUnit: saved.sourceUnit,
        sourceDate: saved.sourceDate,
        sourceTime: saved.sourceTime,
        sourceTimeUnix: saved.sourceTimeUnix,
        fetchedAt: saved.fetchedAt,
        fingerprint,
        rawPayload: { fixture: true },
      },
      update: {},
    });
  }

  console.log(`Seeded ${COLLECTIONS.length} collections and ${PRODUCTS.length} products.`);
}

seed()
  .catch(error => {
    console.error("ELORIA seed failed.", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
    await databasePool.end().catch(() => undefined);
  });
