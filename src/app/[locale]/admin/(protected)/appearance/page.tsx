import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { HomeAppearanceEditor } from "@/components/admin/home-appearance-editor";

export const runtime = "nodejs";
export const maxDuration = 180;

export default async function AppearancePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await requireAdmin(locale === "en" ? "en" : "fa");
  const [products, appearance] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        collection: { isActive: true },
        images: { some: { imageUrl: { not: "" } } },
      },
      orderBy: [{ displayOrder: "asc" }, { nameFa: "asc" }],
      select: {
        id: true,
        nameFa: true,
        slug: true,
        isFeatured: true,
        images: {
          where: { imageUrl: { not: "" } },
          orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          select: { id: true, imageUrl: true },
        },
      },
    }),
    prisma.storefrontAppearance.findUnique({
      where: { id: "home" },
      select: {
        heroScale: true,
        featuredProductIds: true,
        featuredCutoutIds: true,
        updatedAt: true,
        heroCutout: {
          select: { id: true, productId: true, sourceImageId: true },
        },
      },
    }),
  ]);
  const featuredCutouts = appearance?.featuredCutoutIds.length
    ? await prisma.heroCutout.findMany({
        where: { id: { in: appearance.featuredCutoutIds } },
        select: { id: true, productId: true, sourceImageId: true },
      })
    : [];
  return (
    <HomeAppearanceEditor
      products={products}
      initial={{
        productId: appearance?.heroCutout?.productId ?? "",
        imageId: appearance?.heroCutout?.sourceImageId ?? "",
        cutoutId: appearance?.heroCutout?.id ?? "",
        scale: appearance?.heroScale ?? 90,
        featuredIds: appearance?.featuredProductIds.length
          ? appearance.featuredProductIds
          : products
              .filter((p) => p.isFeatured)
              .slice(0, 8)
              .map((p) => p.id),
        featuredCutouts,
        version: appearance?.updatedAt.toISOString() ?? null,
      }}
    />
  );
}
