import { Prisma } from "@/generated/prisma/client";

export type InventoryRestorationIssue = {
  orderItemId: string;
  productId: string | null;
  variantId: string | null;
  quantity: number;
  reason: "PRODUCT_NOT_FOUND" | "VARIANT_NOT_FOUND" | "INVENTORY_REFERENCE_MISSING";
};

export async function syncProductInventory(
  transaction: Prisma.TransactionClient,
  productId: string,
): Promise<{ stock: number; status: string | null }> {
  const [product, variants] = await Promise.all([
    transaction.product.findUnique({
      where: { id: productId },
      select: { status: true },
    }),
    transaction.productVariant.findMany({
      where: { productId, isActive: true },
      select: { stock: true },
    }),
  ]);

  if (!product) return { stock: 0, status: null };
  if (variants.length === 0) return { stock: 0, status: product.status };

  const stock = variants.reduce((total, variant) => total + Math.max(variant.stock, 0), 0);
  const status =
    product.status === "ACTIVE" || product.status === "OUT_OF_STOCK"
      ? stock > 0
        ? "ACTIVE"
        : "OUT_OF_STOCK"
      : product.status;

  await transaction.product.update({
    where: { id: productId },
    data: { stock, status },
  });

  return { stock, status };
}

export async function restoreReservedInventory(
  transaction: Prisma.TransactionClient,
  orderId: string,
): Promise<{ restoredUnits: number; issues: InventoryRestorationIssue[] }> {
  const items = await transaction.orderItem.findMany({
    where: { orderId },
    select: { id: true, productId: true, variantId: true, quantity: true },
  });

  const issues: InventoryRestorationIssue[] = [];
  const productsToSync = new Set<string>();
  let restoredUnits = 0;

  for (const item of items) {
    if (item.variantId) {
      const updated = await transaction.productVariant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
      if (updated.count === 1) {
        if (item.productId) productsToSync.add(item.productId);
        restoredUnits += item.quantity;
      } else {
        issues.push({
          orderItemId: item.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          reason: "VARIANT_NOT_FOUND",
        });
      }
      continue;
    }

    if (item.productId) {
      const updated = await transaction.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
      if (updated.count === 1) {
        await transaction.product.updateMany({
          where: { id: item.productId, status: "OUT_OF_STOCK", stock: { gt: 0 } },
          data: { status: "ACTIVE" },
        });
        restoredUnits += item.quantity;
      } else {
        issues.push({
          orderItemId: item.id,
          productId: item.productId,
          variantId: null,
          quantity: item.quantity,
          reason: "PRODUCT_NOT_FOUND",
        });
      }
      continue;
    }

    issues.push({
      orderItemId: item.id,
      productId: null,
      variantId: null,
      quantity: item.quantity,
      reason: "INVENTORY_REFERENCE_MISSING",
    });
  }

  for (const productId of productsToSync) {
    await syncProductInventory(transaction, productId);
  }

  return { restoredUnits, issues };
}
