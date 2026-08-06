import {
  getCatalogPricingCandidates,
  getCatalogPricingPage,
  type CatalogPricingCandidate,
  type CatalogPricingPageResult,
  type CatalogProduct,
  type ProductCatalogFilters,
} from "@/lib/catalog";
import { getMetalRateFreshness } from "@/lib/metal-rate-freshness";
import { getMetalRateSaleDecision } from "@/lib/metal-rate-sale-policy";
import { calculateJewelryPrice } from "@/lib/pricing-engine";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export type PricedCatalogFilters = ProductCatalogFilters & {
  minPriceToman?: string;
  maxPriceToman?: string;
};

export type PricedProductsCatalogResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  priceFilterActive: boolean;
  pricingUnavailableCount: number;
};

type PricingPolicyRecord = Awaited<
  ReturnType<typeof prisma.pricingPolicy.findMany>
>[number];

type MetalPriceRecord = Awaited<
  ReturnType<typeof prisma.metalPrice.findMany>
>[number];

type CatalogPricingCandidatesResult = Awaited<
  ReturnType<typeof getCatalogPricingCandidates>
>;

type CatalogPricingResult =
  | CatalogPricingCandidatesResult
  | CatalogPricingPageResult;

function isCatalogPricingPageResult(
  catalog: CatalogPricingResult,
): catalog is CatalogPricingPageResult {
  return (
    "total" in catalog &&
    "page" in catalog &&
    "pageSize" in catalog &&
    "pageCount" in catalog
  );
}

type PricedCatalogCacheEntry = {
  value: PricedProductsCatalogResult;
  freshUntil: number;
  staleUntil: number;
};

type PricedCatalogGlobal = typeof globalThis & {
  __eloriaPricedCatalogCache?: Map<string, PricedCatalogCacheEntry>;
  __eloriaPricedCatalogInflight?: Map<
    string,
    Promise<PricedProductsCatalogResult>
  >;
};

const pricedCatalogGlobal = globalThis as PricedCatalogGlobal;
const pricedCatalogCache =
  pricedCatalogGlobal.__eloriaPricedCatalogCache ??
  new Map<string, PricedCatalogCacheEntry>();
const pricedCatalogInflight =
  pricedCatalogGlobal.__eloriaPricedCatalogInflight ??
  new Map<string, Promise<PricedProductsCatalogResult>>();

pricedCatalogGlobal.__eloriaPricedCatalogCache = pricedCatalogCache;
pricedCatalogGlobal.__eloriaPricedCatalogInflight = pricedCatalogInflight;

function normalizeDigits(value: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  return value
    .replace(/[۰-۹]/g, digit => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(arabicDigits.indexOf(digit)))
    .replace(/[^\d]/g, "");
}

function parsePriceBoundary(value?: string): bigint | null {
  if (!value) return null;
  const normalized = normalizeDigits(value);
  if (!normalized) return null;
  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

function normalizePage(value: number | undefined): number {
  return Number.isFinite(value) ? Math.max(1, Math.trunc(value as number)) : 1;
}

function normalizePageSize(value: number | undefined): number {
  return Number.isFinite(value)
    ? Math.min(48, Math.max(1, Math.trunc(value as number)))
    : 24;
}

function getCatalogCacheKey(filters: PricedCatalogFilters): string {
  return JSON.stringify({
    search: filters.search?.trim() ?? "",
    collectionSlug: filters.collectionSlug?.trim().toLowerCase() ?? "",
    material: filters.material ?? "",
    availability: filters.availability ?? "ALL",
    page: normalizePage(filters.page),
    pageSize: normalizePageSize(filters.pageSize),
    minPriceToman: normalizeDigits(filters.minPriceToman ?? ""),
    maxPriceToman: normalizeDigits(filters.maxPriceToman ?? ""),
  });
}

function calculateCatalogPrice({
  product,
  policy,
  metalPrice,
  now,
}: {
  product: CatalogPricingCandidate;
  policy: PricingPolicyRecord | undefined;
  metalPrice: MetalPriceRecord | undefined;
  now: Date;
}): bigint | null {
  if (product.pricingMode === "MANUAL") {
    return product.manualPrice ? BigInt(product.manualPrice) : null;
  }

  if (
    !policy ||
    !metalPrice ||
    product.currency !== "TOMAN" ||
    !product.metalWeight ||
    !product.purityFineness
  ) {
    return null;
  }

  const freshness = getMetalRateFreshness({
    sourceTimeUnix: metalPrice.sourceTimeUnix,
    staleAfterMinutes: policy.staleAfterMinutes,
    now,
  });

  const saleDecision = getMetalRateSaleDecision({
    material: product.material,
    referencePricePerGramToman: metalPrice.pricePerGram.toString(),
    freshness,
    closedMarketPricingEnabled: policy.closedMarketPricingEnabled,
    closedMarketMaxAgeMinutes: policy.closedMarketMaxAgeMinutes,
    closedMarketSafetyMarginPercent:
      policy.closedMarketSafetyMarginPercent.toString(),
  });

  if (!saleDecision.isUsableForSale) {
    return null;
  }

  const displayRate = saleDecision.effectivePricePerGramToman;
  if (!displayRate) {
    return null;
  }

  const result = calculateJewelryPrice({
    material: product.material,
    weightGrams: product.metalWeight,
    productPurity: product.purityFineness,
    referencePricePerGramToman: displayRate,
    referencePurity: policy.referencePurity,
    makingChargeType: product.makingChargeType,
    makingChargeFixedToman: product.makingChargeFixed,
    makingChargePerGramToman: product.makingChargePerGram,
    makingChargePercent: product.makingChargePercent,
    artisticFeeToman: product.artisticFee,
    profitPercent:
      product.profitPercent ?? policy.defaultProfitPercent.toString(),
    taxPercent: product.taxPercent ?? policy.defaultTaxPercent.toString(),
    taxMetalValue: policy.taxMetalValue,
    roundingStepToman: policy.roundingStep,
  });

  return BigInt(result.finalPriceToman);
}

async function loadPricedProductsCatalog(
  filters: PricedCatalogFilters,
): Promise<PricedProductsCatalogResult> {
  let minPrice = parsePriceBoundary(filters.minPriceToman);
  let maxPrice = parsePriceBoundary(filters.maxPriceToman);

  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const priceFilterActive = minPrice !== null || maxPrice !== null;
  const catalog = await (priceFilterActive
      ? getCatalogPricingCandidates(filters)
      : getCatalogPricingPage(filters));
  const policies = await withDatabaseRetry(() =>
    prisma.pricingPolicy.findMany({
      where: { isActive: true },
    }),
  );

  const metalPrices = await withDatabaseRetry(() =>
    prisma.metalPrice.findMany(),
  );

  const policiesByMaterial = new Map(
    policies.map(policy => [policy.material, policy]),
  );
  const pricesByMaterial = new Map(
    metalPrices.map(price => [price.material, price]),
  );
  const now = new Date();
  let pricingUnavailableCount = 0;

  if (!priceFilterActive && isCatalogPricingPageResult(catalog)) {
    const products = catalog.candidates.map(product => {
      let finalPrice: bigint | null = null;

      try {
        finalPrice = calculateCatalogPrice({
          product,
          policy: policiesByMaterial.get(product.material),
          metalPrice: pricesByMaterial.get(product.material),
          now,
        });
      } catch (error) {
        console.error(`[Eloria Catalog] Unable to price ${product.slug}.`, error);
      }

      if (finalPrice === null) {
        pricingUnavailableCount += 1;
      }

      return {
        ...product,
        displayPriceToman: finalPrice?.toString() ?? null,
      } satisfies CatalogProduct;
    });

    return {
      products,
      total: catalog.total,
      page: catalog.page,
      pageSize: catalog.pageSize,
      pageCount: catalog.pageCount,
      priceFilterActive: false,
      pricingUnavailableCount,
    };
  }

  const filtered: CatalogProduct[] = [];

  for (const product of catalog.candidates) {
    let finalPrice: bigint | null = null;

    try {
      finalPrice = calculateCatalogPrice({
        product,
        policy: policiesByMaterial.get(product.material),
        metalPrice: pricesByMaterial.get(product.material),
        now,
      });
    } catch (error) {
      console.error(`[Eloria Catalog] Unable to price ${product.slug}.`, error);
    }

    if (finalPrice === null) {
      pricingUnavailableCount += 1;
      continue;
    }
    if (minPrice !== null && finalPrice < minPrice) continue;
    if (maxPrice !== null && finalPrice > maxPrice) continue;

    filtered.push({
      ...product,
      displayPriceToman: finalPrice.toString(),
    });
  }

  const pageSize = normalizePageSize(filters.pageSize);
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(normalizePage(filters.page), pageCount);
  const start = (page - 1) * pageSize;

  return {
    products: filtered.slice(start, start + pageSize),
    total: filtered.length,
    page,
    pageSize,
    pageCount,
    priceFilterActive: true,
    pricingUnavailableCount,
  };
}

function refreshPricedCatalog(
  key: string,
  filters: PricedCatalogFilters,
): Promise<PricedProductsCatalogResult> {
  const existing = pricedCatalogInflight.get(key);
  if (existing) return existing;

  const request = loadPricedProductsCatalog(filters)
    .then(value => {
      const storedAt = Date.now();
      pricedCatalogCache.set(key, {
        value,
        freshUntil: storedAt + 30_000,
        staleUntil: storedAt + 10 * 60_000,
      });
      return value;
    })
    .finally(() => {
      pricedCatalogInflight.delete(key);
    });

  pricedCatalogInflight.set(key, request);
  return request;
}

export async function getPricedProductsCatalog(
  filters: PricedCatalogFilters,
): Promise<PricedProductsCatalogResult> {
  const key = getCatalogCacheKey(filters);
  const cached = pricedCatalogCache.get(key);
  const now = Date.now();

  if (cached?.freshUntil && cached.freshUntil > now) {
    return cached.value;
  }

  if (cached?.staleUntil && cached.staleUntil > now) {
    void refreshPricedCatalog(key, filters).catch(error => {
      console.warn(
        "[Eloria Catalog] Unable to refresh priced catalog; serving stale data.",
        error,
      );
    });
    return cached.value;
  }

  return refreshPricedCatalog(key, filters);
}
