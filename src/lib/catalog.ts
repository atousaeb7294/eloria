import type { Prisma } from "@/generated/prisma/client";
import { normalizeCatalogPage } from "@/lib/catalog-pagination";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export type CatalogMaterial = "GOLD" | "SILVER";
export type CatalogAvailability = "ALL" | "AVAILABLE" | "OUT_OF_STOCK";

export type ProductCatalogFilters = {
  search?: string;
  collectionSlug?: string;
  material?: CatalogMaterial;
  availability?: CatalogAvailability;
  page?: number;
  pageSize?: number;
};

export type CatalogProduct = {
  id: string;
  slug: string;
  sku: string | null;
  nameFa: string;
  nameEn: string;
  material: CatalogMaterial;
  collectionSlug: string;
  stock: number;
  isAvailable: boolean;
  image: {
    imageUrl: string;
    altFa: string | null;
    altEn: string | null;
  } | null;
  displayPriceToman: string | null;
};

export type CatalogCollectionOption = {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  imageUrl: string | null;
  productCount: number;
};

export type ProductsCatalogResult = {
  products: CatalogProduct[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  selectedCollection: {
    id: string;
    slug: string;
  } | null;
};

export type CollectionCatalog = {
  collection: {
    id: string;
    slug: string;
  };
  products: CatalogProduct[];
};

export type CatalogPricingCandidate = CatalogProduct & {
  pricingMode: "DYNAMIC" | "MANUAL";
  currency: "TOMAN" | "USD";
  manualPrice: string | null;
  metalWeight: string | null;
  purityFineness: number | null;
  makingChargeType: "NONE" | "FIXED" | "PER_GRAM" | "PERCENT" | "COMBINED";
  makingChargeFixed: string;
  makingChargePerGram: string;
  makingChargePercent: string;
  artisticFee: string;
  profitPercent: string | null;
  taxPercent: string | null;
};

export type CatalogPricingPageResult = {
  candidates: CatalogPricingCandidate[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  selectedCollection: {
    id: string;
    slug: string;
  } | null;
};

export class CatalogError extends Error {
  readonly code:
    | "INVALID_COLLECTION_SLUG"
    | "COLLECTION_NOT_FOUND"
    | "PRICE_FILTER_TOO_BROAD";
  readonly status: number;

  constructor(
    code: CatalogError["code"],
    message: string,
    status = 400,
  ) {
    super(message);
    this.name = "CatalogError";
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;
const MAX_PRICE_FILTER_CANDIDATES = 500;

function normalizeCollectionSlug(slug: string): string {
  const normalized = slug.trim().toLowerCase();
  if (!normalized || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(normalized)) {
    throw new CatalogError(
      "INVALID_COLLECTION_SLUG",
      "شناسه گنجینه معتبر نیست.",
      400,
    );
  }
  return normalized;
}

function normalizeSearch(search?: string): string | undefined {
  const normalized = search?.trim().replace(/\s+/g, " ").slice(0, 80);
  return normalized || undefined;
}

function normalizePositiveInteger(value: number | undefined, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.trunc(value as number));
}

function normalizePagination(filters: ProductCatalogFilters) {
  const page = normalizeCatalogPage(filters.page);
  const pageSize = Math.min(
    normalizePositiveInteger(filters.pageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  );
  return { page, pageSize };
}

async function findCollection(collectionSlug: string) {
  const slug = normalizeCollectionSlug(collectionSlug);
  const collection = await withDatabaseRetry(() => prisma.collection.findFirst({
    where: { slug, isActive: true },
    select: { id: true, slug: true },
  }));

  if (!collection) {
    throw new CatalogError(
      "COLLECTION_NOT_FOUND",
      "گنجینه موردنظر پیدا نشد.",
      404,
    );
  }
  return collection;
}

async function buildCatalogWhere(filters: ProductCatalogFilters) {
  const search = normalizeSearch(filters.search);
  const availability = filters.availability ?? "ALL";
  const selectedCollection = filters.collectionSlug
    ? await findCollection(filters.collectionSlug)
    : null;

  const and: Prisma.ProductWhereInput[] = [];

  if (search) {
    and.push({
      OR: [
        { nameFa: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
        { slug: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  if (availability === "AVAILABLE") {
    and.push({ status: "ACTIVE", stock: { gt: 0 } });
  } else if (availability === "OUT_OF_STOCK") {
    and.push({ OR: [{ status: "OUT_OF_STOCK" }, { stock: { lte: 0 } }] });
  }

  const where: Prisma.ProductWhereInput = {
    status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
    collection: { isActive: true },
    ...(selectedCollection ? { collectionId: selectedCollection.id } : {}),
    ...(filters.material ? { material: filters.material } : {}),
    ...(and.length ? { AND: and } : {}),
  };

  return { where, selectedCollection };
}

const catalogCardSelect = {
  id: true,
  slug: true,
  sku: true,
  nameFa: true,
  nameEn: true,
  material: true,
  stock: true,
  status: true,
  collection: { select: { slug: true } },
  images: {
    orderBy: [{ isPrimary: "desc" as const }, { displayOrder: "asc" as const }],
    take: 1,
    select: { imageUrl: true, altFa: true, altEn: true },
  },
} satisfies Prisma.ProductSelect;

function mapCatalogProduct(product: {
  id: string;
  slug: string;
  sku: string | null;
  nameFa: string;
  nameEn: string;
  material: CatalogMaterial;
  stock: number;
  status: "DRAFT" | "ACTIVE" | "OUT_OF_STOCK" | "ARCHIVED";
  collection: { slug: string };
  images: Array<{ imageUrl: string; altFa: string | null; altEn: string | null }>;
}): CatalogProduct {
  const image = product.images[0] ?? null;
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    nameFa: product.nameFa,
    nameEn: product.nameEn,
    material: product.material,
    collectionSlug: product.collection.slug,
    stock: product.stock,
    isAvailable: product.status === "ACTIVE" && product.stock > 0,
    image: image
      ? { imageUrl: image.imageUrl, altFa: image.altFa, altEn: image.altEn }
      : null,
    displayPriceToman: null,
  };
}

type CatalogCollectionsCacheEntry = {
  value: CatalogCollectionOption[];
  freshUntil: number;
  staleUntil: number;
};

type CatalogCacheGlobal = typeof globalThis & {
  __eloriaCatalogCollectionsCache?: CatalogCollectionsCacheEntry;
  __eloriaCatalogCollectionsInflight?: Promise<CatalogCollectionOption[]>;
};

const catalogCacheGlobal = globalThis as CatalogCacheGlobal;

async function loadActiveCatalogCollections(): Promise<CatalogCollectionOption[]> {
  const collections = await withDatabaseRetry(() => prisma.collection.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      slug: true,
      nameFa: true,
      nameEn: true,
      imageUrl: true,
      _count: {
        select: {
          products: {
            where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] } },
          },
        },
      },
    },
  }));

  return collections.map(collection => ({
    id: collection.id,
    slug: collection.slug,
    nameFa: collection.nameFa,
    nameEn: collection.nameEn,
    imageUrl: collection.imageUrl,
    productCount: collection._count.products,
  }));
}

function refreshCatalogCollections(): Promise<CatalogCollectionOption[]> {
  const existing = catalogCacheGlobal.__eloriaCatalogCollectionsInflight;
  if (existing) return existing;

  const request = loadActiveCatalogCollections()
    .then(value => {
      const storedAt = Date.now();
      catalogCacheGlobal.__eloriaCatalogCollectionsCache = {
        value,
        freshUntil: storedAt + 60_000,
        staleUntil: storedAt + 10 * 60_000,
      };
      return value;
    })
    .finally(() => {
      catalogCacheGlobal.__eloriaCatalogCollectionsInflight = undefined;
    });

  catalogCacheGlobal.__eloriaCatalogCollectionsInflight = request;
  return request;
}

export async function getActiveCatalogCollections(): Promise<CatalogCollectionOption[]> {
  const cached = catalogCacheGlobal.__eloriaCatalogCollectionsCache;
  const now = Date.now();

  if (cached?.freshUntil && cached.freshUntil > now) {
    return cached.value;
  }

  if (cached?.staleUntil && cached.staleUntil > now) {
    void refreshCatalogCollections().catch(error => {
      console.warn(
        "[Eloria Catalog] Unable to refresh collection cache; serving stale data.",
        error,
      );
    });
    return cached.value;
  }

  return refreshCatalogCollections();
}

export async function getProductsCatalog(
  filters: ProductCatalogFilters = {},
): Promise<ProductsCatalogResult> {
  const { where, selectedCollection } = await buildCatalogWhere(filters);
  const { page: requestedPage, pageSize } = normalizePagination(filters);
  const requestedSkip = (requestedPage - 1) * pageSize;

  const [total, requestedProducts] = await Promise.all([
    withDatabaseRetry(() => prisma.product.count({ where })),
    withDatabaseRetry(() => prisma.product.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: requestedSkip,
      take: pageSize,
      select: catalogCardSelect,
    })),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const products =
    page === requestedPage
      ? requestedProducts
      : await withDatabaseRetry(() => prisma.product.findMany({
          where,
          orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: catalogCardSelect,
        }));

  return {
    products: products.map(mapCatalogProduct),
    total,
    page,
    pageSize,
    pageCount,
    selectedCollection,
  };
}

const catalogPricingSelect = {
  ...catalogCardSelect,
  pricingMode: true,
  currency: true,
  price: true,
  metalWeight: true,
  purityFineness: true,
  makingChargeType: true,
  makingChargeFixed: true,
  makingChargePerGram: true,
  makingChargePercent: true,
  artisticFee: true,
  profitPercent: true,
  taxPercent: true,
} satisfies Prisma.ProductSelect;

function mapCatalogPricingCandidate(product: Prisma.ProductGetPayload<{
  select: typeof catalogPricingSelect;
}>): CatalogPricingCandidate {
  return {
    ...mapCatalogProduct(product),
    pricingMode: product.pricingMode,
    currency: product.currency,
    manualPrice: product.price?.toString() ?? null,
    metalWeight: product.metalWeight?.toString() ?? null,
    purityFineness: product.purityFineness,
    makingChargeType: product.makingChargeType,
    makingChargeFixed: product.makingChargeFixed.toString(),
    makingChargePerGram: product.makingChargePerGram.toString(),
    makingChargePercent: product.makingChargePercent.toString(),
    artisticFee: product.artisticFee.toString(),
    profitPercent: product.profitPercent?.toString() ?? null,
    taxPercent: product.taxPercent?.toString() ?? null,
  };
}

export async function getCatalogPricingCandidates(
  filters: ProductCatalogFilters,
): Promise<{ candidates: CatalogPricingCandidate[]; selectedCollection: { id: string; slug: string } | null }> {
  const { where, selectedCollection } = await buildCatalogWhere(filters);

  const total = await withDatabaseRetry(() =>
    prisma.product.count({ where }),
  );

  if (total > MAX_PRICE_FILTER_CANDIDATES) {
    throw new CatalogError(
      "PRICE_FILTER_TOO_BROAD",
      "برای فیلتر قیمت، ابتدا جست‌وجو یا گنجینه را محدود کنید.",
      422,
    );
  }

  const products = await withDatabaseRetry(() =>
    prisma.product.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      take: MAX_PRICE_FILTER_CANDIDATES,
      select: catalogPricingSelect,
    }),
  );

  return {
    selectedCollection,
    candidates: products.map(mapCatalogPricingCandidate),
  };
}

export async function getCatalogPricingPage(
  filters: ProductCatalogFilters = {},
): Promise<CatalogPricingPageResult> {
  const { where, selectedCollection } = await buildCatalogWhere(filters);
  const { page: requestedPage, pageSize } = normalizePagination(filters);
  const requestedSkip = (requestedPage - 1) * pageSize;

  const [total, requestedProducts] = await Promise.all([
    withDatabaseRetry(() => prisma.product.count({ where })),
    withDatabaseRetry(() => prisma.product.findMany({
      where,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
      skip: requestedSkip,
      take: pageSize,
      select: catalogPricingSelect,
    })),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  const products =
    page === requestedPage
      ? requestedProducts
      : await withDatabaseRetry(() => prisma.product.findMany({
          where,
          orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
          skip: (page - 1) * pageSize,
          take: pageSize,
          select: catalogPricingSelect,
        }));

  return {
    candidates: products.map(mapCatalogPricingCandidate),
    total,
    page,
    pageSize,
    pageCount,
    selectedCollection,
  };
}

export async function getCollectionCatalog(
  collectionSlug: string,
  material?: CatalogMaterial,
): Promise<CollectionCatalog> {
  const result = await getProductsCatalog({
    collectionSlug,
    material,
    availability: "ALL",
    pageSize: MAX_PAGE_SIZE,
  });

  if (!result.selectedCollection) {
    throw new CatalogError("COLLECTION_NOT_FOUND", "گنجینه موردنظر پیدا نشد.", 404);
  }

  return { collection: result.selectedCollection, products: result.products };
}
