import { prisma } from "@/lib/prisma";
import {
  CheckoutOrderError,
  type CheckoutOrderResult,
} from "@/lib/checkout-order/contracts";
import {
  hasMatchingCheckoutIdempotencyOwner,
} from "@/lib/checkout-idempotency";
import { serializeOrder } from "@/lib/checkout-order/helpers";

export async function findExistingOrder(
  idempotencyKey:
    string,
  customerMobile:
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

  if (
    !hasMatchingCheckoutIdempotencyOwner(
      existingOrder.customerMobile,
      customerMobile,
    )
  ) {
    throw new CheckoutOrderError(
      "IDEMPOTENCY_KEY_CONFLICT",
      "شناسه یکتای این درخواست قبلاً مصرف شده است. لطفاً دوباره تلاش کنید.",
      409,
    );
  }

  return serializeOrder(
    existingOrder,
    true,
  );
}
