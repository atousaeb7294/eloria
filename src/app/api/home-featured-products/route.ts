import { NextResponse } from "next/server";

import { withDatabaseStatementTimeout } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DATABASE_TIMEOUT_MS = 2_500;
const FAILURE_COOLDOWN_MS = 60_000;
const SMART_LOOKBACK_DAYS = 14;

type HomeFeaturedItem = {
  slug: string;
  name: string;
  imageUrl: string;
  href: string;
  badge?: string;
  collectionName?: string;
  material?: "GOLD" | "SILVER";
  hasGold?: boolean;
  hasSilver?: boolean;
  audience?: "WOMEN" | "MEN";
  stock?: number;
  previewPriceToman?: string;
  previewOnly?: boolean;
};

const DEFAULT_STORY_IMAGE = "/images/hero/eloria-hero.webp";

function storyImage(product: {
  images: Array<{ imageUrl: string }>;
  worldSceneImageUrl?: string | null;
  characterImageUrl?: string | null;
  collection: { imageUrl?: string | null };
}) {
  return product.images[0]?.imageUrl?.trim()
    || product.worldSceneImageUrl?.trim()
    || product.characterImageUrl?.trim()
    || product.collection.imageUrl?.trim()
    || DEFAULT_STORY_IMAGE;
}

let retryAfterTimestamp = 0;

function developmentPreview(locale:"fa"|"en"):HomeFeaturedItem[] {
  if(process.env.NODE_ENV==="production")return [];
  const fa=locale==="fa";
  const products=[
    ["preview-gold-necklace",fa?"گردنبند خورشید":"Sun necklace","/images/collections/necklaces.webp","GOLD","24500000"],
    ["preview-gold-bracelet",fa?"دستبند روشنایی":"Light bracelet","/images/collections/bracelet.webp","GOLD","18750000"],
    ["preview-silver-earring",fa?"گوشواره مهتاب":"Moonlight earrings","/images/collections/earring.webp","SILVER","6950000"],
    ["preview-silver-bracelet",fa?"دستبند سپیدار":"Silver bracelet","/images/collections/bracelet.jpg","SILVER","8300000"],
    ["preview-woven-one",fa?"نشان بافتهٔ هفت نگهبان":"Seven guardians weave","/images/guardians/atousa-202609.webp","WEAVE","3200000"],
    ["preview-woven-two",fa?"بافت افسانهٔ آناهید":"Anahid story weave","/images/guardians/anahid.webp","WEAVE","2850000"],
  ] as const;
  return products.map(([slug,name,imageUrl,material,previewPriceToman])=>({slug,name,imageUrl,href:`/${locale}/collections`,material:material==="GOLD"||material==="SILVER"?material:undefined,hasGold:material==="GOLD",hasSilver:material==="SILVER",stock:1,badge:fa?"پیش‌نمایش محلی چیدمان":"Local layout preview",previewPriceToman,previewOnly:true}));
}

const configuredSlugs = (process.env.HOME_FEATURED_PRODUCT_SLUGS ?? "")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean);

function jsonResponse(items: HomeFeaturedItem[], source: "database-smart" | "database-compatible" | "cooldown" | "fallback") {
  const cacheControl = source === "database-smart" || source === "database-compatible"
    ? "public, max-age=60, s-maxage=300, stale-while-revalidate=1800"
    : "public, max-age=10, s-maxage=20";

  return NextResponse.json(
    { items },
    { status: 200, headers: { "Cache-Control": cacheControl, "X-Eloria-Featured-Source": source } },
  );
}

function tehranDateKey(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function stableDailyNudge(slug: string, dateKey: string) {
  const text = `${dateKey}:${slug}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash % 1000) / 1000;
}

function ageInDays(createdAt: Date, now: Date) {
  return Math.max(0, (now.getTime() - createdAt.getTime()) / 86_400_000);
}

function freshnessScore(createdAt: Date, now: Date) {
  const ageDays = ageInDays(createdAt, now);
  if (ageDays <= 2) return 22;
  if (ageDays <= 7) return 16;
  if (ageDays <= 21) return 10;
  if (ageDays <= 45) return 5;
  return 0;
}

function momentumScore(currentViews: number, previousViews: number) {
  if (currentViews < 3) return 0;
  if (previousViews === 0) return Math.min(12, currentViews * 0.8);
  const ratio = currentViews / Math.max(1, previousViews);
  return Math.max(-5, Math.min(14, (ratio - 1) * 9));
}

function editorialBadge(input: {
  locale: "fa" | "en";
  sales: number;
  currentViews: number;
  previousViews: number;
  favorites: number;
  isFeatured: boolean;
  createdAt: Date;
  now: Date;
}) {
  const { locale, sales, currentViews, previousViews, favorites, isFeatured, createdAt, now } = input;
  const fa = locale === "fa";
  const rising = currentViews >= 8 && (previousViews === 0 || currentViews >= previousViews * 1.6);
  if (sales >= 2) return fa ? "پرفروش این روزها" : "Best seller";
  if (rising) return fa ? "رو به اوج" : "Rising now";
  if (favorites >= 4) return fa ? "دل‌خواه مخاطبان" : "Most saved";
  if (ageInDays(createdAt, now) <= 10) return fa ? "تازه از کارگاه" : "New from the atelier";
  if (isFeatured) return fa ? "منتخب الوریا" : "Eloria selection";
  return fa ? "کشف امروز" : "Today’s discovery";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale: "fa" | "en" = url.searchParams.get("locale") === "en" ? "en" : "fa";

  if (Date.now() < retryAfterTimestamp) return jsonResponse(developmentPreview(locale), "cooldown");

  const now = new Date();
  const recentSince = new Date(now.getTime() - SMART_LOOKBACK_DAYS * 86_400_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);
  const dateKey = tehranDateKey(now);

  try {
    const result = await withDatabaseStatementTimeout(DATABASE_TIMEOUT_MS, async (transaction) => {
      const products = await transaction.product.findMany({
        where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true } },
        orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
        select: {
          id: true,
          slug: true,
          nameFa: true,
          nameEn: true,
          collectionId: true,
          material: true,
          hasGold: true,
          hasSilver: true,
          specifications: true,
          stock: true,
          isFeatured: true,
          createdAt: true,
          characterImageUrl: true,
          worldSceneImageUrl: true,
          collection: { select: { nameFa: true, nameEn: true, imageUrl: true } },
          images: {
            take: 1,
            orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
            select: { imageUrl: true },
          },
        },
      });

      const slugs = products.map((product) => product.slug);
      const ids = products.map((product) => product.id);
      if (!slugs.length) {
        return { products, currentViews: [], previousViews: [], recentSales: [], favoriteCounts: [] };
      }

      const [currentViews, previousViews, recentSales, favoriteCounts] = await Promise.all([
        transaction.siteMeasurementEvent.groupBy({
          by: ["productSlug"],
          where: { eventType: "view_item", occurredAt: { gte: sevenDaysAgo }, productSlug: { in: slugs } },
          _count: { _all: true },
        }),
        transaction.siteMeasurementEvent.groupBy({
          by: ["productSlug"],
          where: { eventType: "view_item", occurredAt: { gte: recentSince, lt: sevenDaysAgo }, productSlug: { in: slugs } },
          _count: { _all: true },
        }),
        transaction.orderItem.groupBy({
          by: ["productSlug"],
          where: {
            productSlug: { in: slugs },
            createdAt: { gte: recentSince },
            order: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] } },
          },
          _sum: { quantity: true },
        }),
        transaction.customerFavorite.groupBy({
          by: ["productId"],
          where: { productId: { in: ids } },
          _count: { _all: true },
        }),
      ]);

      return { products, currentViews, previousViews, recentSales, favoriteCounts };
    });

    retryAfterTimestamp = 0;

    const currentViewMap = new Map(
      result.currentViews.filter((row) => row.productSlug).map((row) => [row.productSlug as string, row._count._all]),
    );
    const previousViewMap = new Map(
      result.previousViews.filter((row) => row.productSlug).map((row) => [row.productSlug as string, row._count._all]),
    );
    const salesMap = new Map(result.recentSales.map((row) => [row.productSlug, row._sum.quantity ?? 0]));
    const favoriteMap = new Map(result.favoriteCounts.map((row) => [row.productId, row._count._all]));
    const configuredPriority = new Map(configuredSlugs.map((slug, index) => [slug, configuredSlugs.length - index]));

    const ranked = result.products
      .map((product) => {
        const currentViews = currentViewMap.get(product.slug) ?? 0;
        const previousViews = previousViewMap.get(product.slug) ?? 0;
        const totalViews = currentViews + previousViews;
        const sales = salesMap.get(product.slug) ?? 0;
        const favorites = favoriteMap.get(product.id) ?? 0;
        const pinned = configuredPriority.get(product.slug) ?? 0;
        const conversion = totalViews > 0 ? sales / totalViews : 0;

        const score =
          pinned * 1_000 +
          Math.min(totalViews, 90) * 1.05 +
          Math.min(sales, 12) * 17 +
          Math.min(favorites, 30) * 3.2 +
          Math.min(8, conversion * 28) +
          momentumScore(currentViews, previousViews) +
          (product.isFeatured ? 18 : 0) +
          (product.stock > 0 ? 9 : -10) +
          freshnessScore(product.createdAt, now) +
          stableDailyNudge(product.slug, dateKey);

        return { product, score, currentViews, previousViews, sales, favorites };
      })
      .sort((left, right) => right.score - left.score);

    const selected: typeof ranked = [];
    const selectedSlugs = new Set<string>();
    const usedCollections = new Set<string>();

    for (const entry of ranked) {
      if (usedCollections.has(entry.product.collectionId) && configuredSlugs.length === 0) continue;
      selected.push(entry);
      selectedSlugs.add(entry.product.slug);
      usedCollections.add(entry.product.collectionId);
    }

    for (const entry of ranked) {
      if (selectedSlugs.has(entry.product.slug)) continue;
      selected.push(entry);
      selectedSlugs.add(entry.product.slug);
    }

    const items: HomeFeaturedItem[] = selected.map(({ product, currentViews, previousViews, sales, favorites }) => ({
      slug: product.slug,
      name: locale === "fa" ? product.nameFa : product.nameEn,
      imageUrl: storyImage(product),
      href: `/${locale}/products/${product.slug}`,
      collectionName: locale === "fa" ? product.collection.nameFa : product.collection.nameEn,
      material: product.material,
      hasGold: product.hasGold,
      hasSilver: product.hasSilver,
      audience: product.specifications !== null && typeof product.specifications === "object" && !Array.isArray(product.specifications) && (product.specifications as Record<string, unknown>).eloriaAudience === "MEN" ? "MEN" : "WOMEN",
      stock: product.stock,
      badge: editorialBadge({
        locale,
        sales,
        currentViews,
        previousViews,
        favorites,
        isFeatured: product.isFeatured,
        createdAt: product.createdAt,
        now,
      }),
    }));

    return jsonResponse(items, "database-smart");
  } catch (error) {
    console.warn("[Eloria Home] Smart ranking unavailable; trying the pre-migration compatible product feed.", error);

    try {
      const products = await withDatabaseStatementTimeout(DATABASE_TIMEOUT_MS, (transaction) =>
        transaction.product.findMany({
          where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] }, collection: { isActive: true } },
          orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
          select: {
            slug: true,
            nameFa: true,
            nameEn: true,
            material: true,
            specifications: true,
            stock: true,
            characterImageUrl: true,
            worldSceneImageUrl: true,
            collection: { select: { nameFa: true, nameEn: true, imageUrl: true } },
            images: {
              take: 1,
              orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }, { createdAt: "asc" }],
              select: { imageUrl: true },
            },
          },
        }),
      );

      const items: HomeFeaturedItem[] = products
        .map((product) => {
          const specifications = product.specifications !== null && typeof product.specifications === "object" && !Array.isArray(product.specifications)
            ? product.specifications as Record<string, unknown>
            : {};
          const hasGold = product.material === "GOLD" || specifications.hasGold === true;
          const hasSilver = product.material === "SILVER" || specifications.hasSilver === true;

          return {
            slug: product.slug,
            name: locale === "fa" ? product.nameFa : product.nameEn,
            imageUrl: storyImage(product),
            href: `/${locale}/products/${product.slug}`,
            collectionName: locale === "fa" ? product.collection.nameFa : product.collection.nameEn,
            material: product.material,
            hasGold,
            hasSilver,
            audience: specifications.eloriaAudience === "MEN" ? "MEN" : "WOMEN",
            stock: product.stock,
            badge: locale === "fa" ? "اثر الوریا" : "Eloria creation",
          };
        });

      retryAfterTimestamp = 0;
      return jsonResponse(items, "database-compatible");
    } catch (compatibleError) {
      const localPreview = developmentPreview(locale);
      if (localPreview.length) {
        retryAfterTimestamp = Date.now() + FAILURE_COOLDOWN_MS;
        console.warn("[Eloria Home] Local database is unavailable; using the development story preview.", compatibleError);
        return jsonResponse(localPreview, "fallback");
      }

      const productionSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
      const alreadyMirrored = request.headers.get("x-eloria-product-mirror") === "1";
      if (productionSite && !alreadyMirrored) {
        try {
          const productionOrigin = new URL(productionSite).origin;
          if (productionOrigin !== new URL(request.url).origin) {
            const mirroredResponse = await fetch(`${productionOrigin}/api/home-featured-products?locale=${locale}`, {
              headers: { "x-eloria-product-mirror": "1" },
              cache: "no-store",
              signal: AbortSignal.timeout(DATABASE_TIMEOUT_MS * 2),
            });
            if (mirroredResponse.ok) {
              const mirroredPayload = await mirroredResponse.json() as { items?: HomeFeaturedItem[] };
              if (mirroredPayload.items?.length) {
                retryAfterTimestamp = 0;
                return jsonResponse(mirroredPayload.items, "database-compatible");
              }
            }
          }
        } catch (mirrorError) {
          console.warn("[Eloria Home] Production product mirror unavailable.", mirrorError);
        }
      }

      retryAfterTimestamp = Date.now() + FAILURE_COOLDOWN_MS;
      console.warn("[Eloria Home] Product feed unavailable; local treasury fallback remains active.", compatibleError);
      return jsonResponse(developmentPreview(locale), "fallback");
    }
  }
}
