import "server-only";
import { prisma } from "@/lib/prisma";
import { HERO_PIPELINE_VERSION } from "@/lib/home-design-contract";
/** Visitors only read prepared images. CPU-heavy preparation belongs to the
 * authenticated appearance editor, never a storefront page view. */
export async function automaticCutoutStatus(ids: string[]) {
  const images = await prisma.productImage.findMany({
    where: {
      id: { in: ids },
      product: {
        status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
        collection: { isActive: true },
      },
    },
    select: { id: true, productId: true, imageUrl: true },
  });
  const assets = await prisma.heroCutout.findMany({
    where: {
      sourceImageId: { in: images.map((image) => image.id) },
      pipelineVersion: HERO_PIPELINE_VERSION,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sourceImageId: true,
      sourceImageUrl: true,
      productId: true,
    },
  });
  const ready: Record<string, string> = {};
  for (const image of images) {
    const asset = assets.find(
      (item) =>
        item.sourceImageId === image.id &&
        item.productId === image.productId &&
        item.sourceImageUrl === image.imageUrl,
    );
    if (asset) ready[image.id] = `/api/media/hero/${asset.id}`;
  }
  return { ready, pending: [] as string[] };
}
