import { NextResponse } from "next/server";

import { withDatabaseStatementTimeout } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DATABASE_TIMEOUT_MS = 2_200;
const FAILURE_COOLDOWN_MS = 60_000;
const SMART_LOOKBACK_DAYS = 14;
const SMART_CANDIDATE_LIMIT = 48;
const SMART_RESULT_LIMIT = 12;

let retryAfterTimestamp = 0;

const configuredSlugs = (process.env.HOME_FEATURED_PRODUCT_SLUGS ?? "")
  .split(",")
  .map((slug) => slug.trim())
  .filter(Boolean)
  .slice(0, SMART_RESULT_LIMIT);

function jsonResponse(
  items: Array<{
    slug: string;
    name: string;
    imageUrl: string;
    href: string;
  }>,
  source: "database-smart" | "cooldown" | "fallback",
) {
  const cacheControl =
    source === "database-smart"
      ? "public, max-age=60, s-maxage=300, stale-while-revalidate=1800"
      : "public, max-age=10, s-maxage=20";

  return NextResponse.json(
    { items },
    {
      status: 200,
      headers: {
        "Cache-Control": cacheControl,
        "X-Eloria-Featured-Source": source,
      },
    },
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

function freshnessScore(createdAt: Date, now: Date) {
  const ageDays = Math.max(0, (now.getTime() - createdAt.getTime()) / 86_400_000);
  if (ageDays <= 2) return 22;
  if (ageDays <= 7) return 16;
  if (ageDays <= 21) return 10;
  if (ageDays <= 45) return 5;
  return 0;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fa";

  if (Date.now() < retryAfterTimestamp) {
    return jsonResponse([], "cooldown");
  }

  const now = new Date();
  const recentSince = new Date(now.getTime() - SMART_LOOKBACK_DAYS * 86_400_000);
  const dateKey = tehranDateKey(now);

  try {
    const result = await withDatabaseStatementTimeout(
      DATABASE_TIMEOUT_MS,
      async (transaction) => {
        const products = await transaction.product.findMany({
          take: SMART_CANDIDATE_LIMIT,
          where: {
            status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
            collection: { isActive: true },
          },
          orderBy: [
            { isFeatured: "desc" },
            { createdAt: "desc" },
          ],
          select: {
            id: true,
            slug: true,
            nameFa: true,
            nameEn: true,
            collectionId: true,
            stock: true,
            isFeatured: true,
            createdAt: true,
            images: {
              take: 1,
              orderBy: [
                { isPrimary: "desc" },
                { displayOrder: "asc" },
                { createdAt: "asc" },
              ],
              select: { imageUrl: true },
            },
          },
        });

        const candidateSlugs = products.map((product) => product.slug);
        const candidateIds = products.map((product) => product.id);

        if (candidateSlugs.length === 0) {
          return { products, recentViews: [], recentSales: [], favoriteCounts: [] };
        }

        const [recentViews, recentSales, favoriteCounts] = await Promise.all([
          transaction.siteMeasurementEvent.groupBy({
            by: ["productSlug"],
            where: {
              eventType: "view_item",
              occurredAt: { gte: recentSince },
              productSlug: { in: candidateSlugs },
            },
            _count: { _all: true },
          }),
          transaction.orderItem.groupBy({
            by: ["productSlug"],
            where: {
              productSlug: { in: candidateSlugs },
              createdAt: { gte: recentSince },
              order: {
                status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] },
              },
            },
            _sum: { quantity: true },
          }),
          transaction.customerFavorite.groupBy({
            by: ["productId"],
            where: { productId: { in: candidateIds } },
            _count: { _all: true },
          }),
        ]);

        return { products, recentViews, recentSales, favoriteCounts };
      },
    );

    retryAfterTimestamp = 0;

    const viewMap = new Map(
      result.recentViews
        .filter((row) => row.productSlug)
        .map((row) => [row.productSlug as string, row._count._all]),
    );
    const salesMap = new Map(
      result.recentSales.map((row) => [row.productSlug, row._sum.quantity ?? 0]),
    );
    const favoriteByProductId = new Map(
      result.favoriteCounts.map((row) => [row.productId, row._count._all]),
    );

    const configuredPriority = new Map(
      configuredSlugs.map((slug, index) => [slug, configuredSlugs.length - index]),
    );

    const ranked = result.products
      .filter((product) => Boolean(product.images[0]?.imageUrl))
      .map((product) => {
        const views = viewMap.get(product.slug) ?? 0;
        const sales = salesMap.get(product.slug) ?? 0;
        const favorites = favoriteByProductId.get(product.id) ?? 0;
        const pinned = configuredPriority.get(product.slug) ?? 0;

        const score =
          pinned * 1_000 +
          Math.min(views, 80) * 1.2 +
          Math.min(sales, 12) * 16 +
          Math.min(favorites, 30) * 3 +
          (product.isFeatured ? 18 : 0) +
          (product.stock > 0 ? 9 : -8) +
          freshnessScore(product.createdAt, now) +
          stableDailyNudge(product.slug, dateKey);

        return { product, score };
      })
      .sort((left, right) => right.score - left.score);

    // Keep the showcase varied: first pass prefers different collections,
    // second pass fills any remaining slots by score.
    const selected: typeof ranked = [];
    const selectedSlugs = new Set<string>();
    const usedCollections = new Set<string>();

    for (const entry of ranked) {
      if (selected.length >= SMART_RESULT_LIMIT) break;
      if (usedCollections.has(entry.product.collectionId) && configuredSlugs.length === 0) continue;
      selected.push(entry);
      selectedSlugs.add(entry.product.slug);
      usedCollections.add(entry.product.collectionId);
    }

    for (const entry of ranked) {
      if (selected.length >= SMART_RESULT_LIMIT) break;
      if (selectedSlugs.has(entry.product.slug)) continue;
      selected.push(entry);
      selectedSlugs.add(entry.product.slug);
    }

    const items = selected.map(({ product }) => ({
      slug: product.slug,
      name: locale === "fa" ? product.nameFa : product.nameEn,
      imageUrl: product.images[0]?.imageUrl ?? "",
      href: `/${locale}/products/${product.slug}`,
    }));

    return jsonResponse(items, "database-smart");
  } catch (error) {
    retryAfterTimestamp = Date.now() + FAILURE_COOLDOWN_MS;

    console.warn(
      "[Eloria Home] Smart featured products unavailable; local fallback remains active.",
      error,
    );

    return jsonResponse([], "fallback");
  }
}
