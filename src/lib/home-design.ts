import "server-only";
import { prisma } from "@/lib/prisma";

export type HomePiece = {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  cutoutUrl?: string;
  group: "gold" | "silver" | "weave";
};
export type HomeDesign = {
  pieces: HomePiece[];
  hero: (HomePiece & { cutoutUrl: string; scale: number }) | null;
  unavailable: boolean;
};

export async function getHomeDesign(locale: string): Promise<HomeDesign> {
  try {
    const appearance = await prisma.storefrontAppearance.findUnique({
      where: { id: "home" },
      select: {
        heroScale: true,
        featuredProductIds: true,
        featuredCutoutIds: true,
        heroCutout: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                slug: true,
                nameFa: true,
                nameEn: true,
                hasGold: true,
                hasSilver: true,
                status: true,
                collection: { select: { isActive: true } },
                images: {
                  orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
                  take: 1,
                  select: { id: true, imageUrl: true },
                },
              },
            },
          },
        },
      },
    });
    const ids = appearance?.featuredProductIds ?? [];
    const records = await prisma.product.findMany({
      where: {
        ...(ids.length
          ? { id: { in: ids.slice(0, 8) } }
          : { isFeatured: true }),
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        collection: { isActive: true },
        images: { some: { imageUrl: { not: "" } } },
      },
      take: 8,
      orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        slug: true,
        nameFa: true,
        nameEn: true,
        hasGold: true,
        hasSilver: true,
        images: {
          where: { imageUrl: { not: "" } },
          take: 1,
          orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          select: { id: true, imageUrl: true },
        },
      },
    });
    const prepared = appearance?.featuredCutoutIds.length
      ? await prisma.heroCutout.findMany({
          where: { id: { in: appearance.featuredCutoutIds } },
          select: {
            id: true,
            productId: true,
            sourceImageId: true,
            sourceImageUrl: true,
          },
        })
      : [];
    const preparedUrl = (p: (typeof records)[number]) => {
      const asset = prepared.find(
        (c) =>
          c.productId === p.id &&
          c.sourceImageId === p.images[0]?.id &&
          c.sourceImageUrl === p.images[0]?.imageUrl,
      );
      return asset ? `/api/media/hero/${asset.id}` : undefined;
    };
    const piece = (p: (typeof records)[number]): HomePiece => ({
      id: p.id,
      slug: p.slug,
      name: locale === "fa" ? p.nameFa : p.nameEn,
      imageUrl: p.images[0]?.imageUrl ?? "",
      cutoutUrl: preparedUrl(p),
      group: p.hasGold ? "gold" : p.hasSilver ? "silver" : "weave",
    });
    if (ids.length)
      records.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
    const cutout = appearance?.heroCutout;
    const visible =
      cutout &&
      cutout.product.status !== "DRAFT" &&
      cutout.product.collection.isActive;
    return {
      pieces: records.map(piece),
      hero: visible
        ? {
            ...piece(cutout.product),
            cutoutUrl: `/api/media/hero/${cutout.id}`,
            scale: Math.min(100, Math.max(60, appearance.heroScale)),
          }
        : null,
      unavailable: false,
    };
  } catch {
    // No fabricated product, price or alternate rectangular photo on failure.
    console.error("[Eloria Home] Appearance or featured products unavailable.");
    return { pieces: [], hero: null, unavailable: true };
  }
}
