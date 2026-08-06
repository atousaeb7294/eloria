import { prisma } from "@/lib/prisma";
import type { CheckoutOrderResult } from "@/lib/checkout-order/contracts";
import { serializeOrder } from "@/lib/checkout-order/helpers";

export async function findExistingOrder(
  idempotencyKey:
    string,
): Promise<CheckoutOrderResult | null> {
  const existingOrder =
    await prisma.order.findUnique({
      where: {
        idempotencyKey,
      },

      include: {
        items: {
          orderBy: {
            createdAt:
              "asc",
          },

          select: {
            id:
              true,

            productSlug:
              true,

            variantId:
              true,

            quantity:
              true,

            unitPriceToman:
              true,

            lineTotalToman:
              true,

            stockBeforeReservation:
              true,

            stockAfterReservation:
              true,
          },
        },
      },
    });

  if (
    !existingOrder
  ) {
    return null;
  }

  return serializeOrder(
    existingOrder,
    true,
  );
}
