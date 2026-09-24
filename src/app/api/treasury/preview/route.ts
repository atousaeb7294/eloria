import { NextResponse } from "next/server";
import { withDatabaseStatementTimeout } from "@/lib/prisma";

export const dynamic = "force-dynamic";
let retryAt = 0;

/** Bounded, read-only home thumbnails. No pricing queries or analytics scan. */
export async function GET(request: Request) {
  const fa = new URL(request.url).searchParams.get("locale") !== "en";
  if (Date.now() < retryAt)
    return NextResponse.json(
      { items: [], source: "unavailable" },
      { headers: { "Cache-Control": "public, max-age=10" } },
    );
  try {
    const groups = await withDatabaseStatementTimeout(2500, async (tx) =>
      Promise.all(
        [
          { hasGold: true },
          { hasSilver: true },
          { hasGold: false, hasSilver: false },
        ].map((metal) =>
          tx.product.findMany({
            where: {
              ...metal,
              status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
              collection: { isActive: true },
              images: { some: { imageUrl: { not: "" } } },
            },
            take: 4,
            orderBy: [{ createdAt: "desc" }, { id: "desc" }],
            select: {
              slug: true,
              createdAt: true,
              nameFa: true,
              nameEn: true,
              hasGold: true,
              hasSilver: true,
              images: {
                where: { imageUrl: { not: "" } },
                take: 1,
                orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
                select: { imageUrl: true },
              },
            },
          }),
        ),
      ),
    );
    const products = [
      ...new Map(
        groups.flat().map((product) => [product.slug, product]),
      ).values(),
    ].sort(
      (a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime() ||
        b.slug.localeCompare(a.slug),
    );
    return NextResponse.json(
      {
        source: "database",
        items: products
          .filter((p) => p.images[0]?.imageUrl)
          .map((p) => ({
            slug: p.slug,
            name: fa ? p.nameFa : p.nameEn,
            hasGold: p.hasGold,
            hasSilver: p.hasSilver,
            imageUrl: p.images[0].imageUrl,
          })),
      },
      {
        headers: {
          "Cache-Control":
            "public, max-age=15, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    retryAt = Date.now() + 15000;
    return NextResponse.json(
      { items: [], source: "unavailable" },
      { headers: { "Cache-Control": "public, max-age=10" } },
    );
  }
}
