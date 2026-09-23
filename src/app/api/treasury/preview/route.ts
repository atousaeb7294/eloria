import { NextResponse } from "next/server";
import { withDatabaseStatementTimeout } from "@/lib/prisma";

export const dynamic = "force-dynamic";
let retryAt = 0;

/** Bounded, read-only home thumbnails. No pricing queries or analytics scan. */
export async function GET(request: Request) {
  const fa = new URL(request.url).searchParams.get("locale") !== "en";
  if (Date.now() < retryAt)
    return NextResponse.json(
      { items: [] },
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
            where: { ...metal, status: { in: ["ACTIVE", "OUT_OF_STOCK"] } },
            take: 6,
            orderBy: [{ isFeatured: "desc" }, { createdAt: "desc" }],
            select: {
              slug: true,
              nameFa: true,
              nameEn: true,
              hasGold: true,
              hasSilver: true,
              images: {
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
    ];
    return NextResponse.json(
      {
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
            "public, max-age=60, s-maxage=120, stale-while-revalidate=300",
        },
      },
    );
  } catch {
    retryAt = Date.now() + 15000;
    return NextResponse.json(
      { items: [] },
      { headers: { "Cache-Control": "public, max-age=10" } },
    );
  }
}
