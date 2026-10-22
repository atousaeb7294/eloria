import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { loadHomeDesign } from "@/lib/home-design-data";
export type { HomeDesign, HomePiece } from "@/lib/home-design-data";

const select = {
  id: true, slug: true, nameFa: true, nameEn: true,
  hasGold: true, hasSilver: true, status: true,
  collection: { select: { isActive: true } },
  images: {
    where: { imageUrl: { not: "" } }, take: 1,
    orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }, { id: "asc" }],
    select: { id: true, imageUrl: true },
  },
} satisfies Prisma.ProductSelect;

export async function getHomeDesign(locale: string) {
  return loadHomeDesign(locale, {
    appearance: () => prisma.storefrontAppearance.findUnique({
      where: { id: "home" },
      select: {
        heroScale: true, featuredProductIds: true, featuredCutoutIds: true,
        heroCutout: { select: { id: true, product: { select } } },
      },
    }),
    products: ({ ids, excludeIds, take }) => prisma.product.findMany({
      where: {
        ...(ids ? { id: { in: ids } } : excludeIds ? { id: { notIn: excludeIds } } : {}),
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        collection: { isActive: true }, images: { some: { imageUrl: { not: "" } } },
      },
      // Optional appearance settings and featured flags never hide live photos.
      orderBy: [{ isFeatured: "desc" }, { displayOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      take, select,
    }),
    cutouts: ids => prisma.heroCutout.findMany({
      where: { id: { in: ids } },
      select: { id: true, productId: true, sourceImageId: true, sourceImageUrl: true },
    }),
    report: area => console.warn(`[Eloria Home] ${area} unavailable; optional media does not hide catalog photos.`),
  });
}
