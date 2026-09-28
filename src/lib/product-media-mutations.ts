import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

/** Serialize gallery writes for one product, including reads used to choose a
 * primary image. Upload/delete network calls belong outside this transaction. */
export function withProductMediaLock<T>(
  productId: string,
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`product-media:${productId}`}))`;
    return operation(tx);
  });
}

export function deleteProductGalleryImage(productId: string, imageId: string) {
  return withProductMediaLock(productId, async (tx) => {
    const image = await tx.productImage.findFirst({
      where: { id: imageId, productId },
      select: { imageUrl: true },
    });
    if (!image) return null;
    await tx.productImage.delete({ where: { id: imageId } });
    await tx.product.updateMany({
      where: { id: productId, characterImageUrl: image.imageUrl },
      data: { characterImageUrl: null },
    });
    await tx.product.updateMany({
      where: { id: productId, worldSceneImageUrl: image.imageUrl },
      data: { worldSceneImageUrl: null },
    });
    const primary = await tx.productImage.findFirst({
      where: { productId, isPrimary: true },
      select: { id: true },
    });
    if (!primary) {
      const first = await tx.productImage.findFirst({
        where: { productId },
        orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      if (first)
        await tx.productImage.update({
          where: { id: first.id },
          data: { isPrimary: true },
        });
    }
    // URL entry can reuse an asset in another gallery or product story.
    const galleryReference = await tx.productImage.findFirst({
      where: { imageUrl: image.imageUrl },
      select: { id: true },
    });
    const storyReference = await tx.product.findFirst({
      where: {
        OR: [
          { characterImageUrl: image.imageUrl },
          { worldSceneImageUrl: image.imageUrl },
        ],
      },
      select: { id: true },
    });
    return {
      imageUrl: image.imageUrl,
      removeAsset: !galleryReference && !storyReference,
    };
  });
}
