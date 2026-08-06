import { randomBytes } from "node:crypto";
import type { Prisma } from "@/generated/prisma/client";
import { CheckoutCustomerError, normalizeCheckoutCustomer, type CheckoutCustomerInput, type NormalizedCheckoutCustomer } from "@/lib/checkout-customer";
import { CheckoutOrderError, MAX_ITEM_QUANTITY, type CheckoutOrderItemInput, type CheckoutOrderResult, type SerializableOrder } from "@/lib/checkout-order/contracts";

export function normalizeIdempotencyKey(
  value:
    string,
): string {
  const normalized =
    value.trim();

  if (
    normalized.length < 16 ||
    normalized.length > 128
  ) {
    throw new CheckoutOrderError(
      "INVALID_IDEMPOTENCY_KEY",

      "شناسه یکتای درخواست پرداخت معتبر نیست.",

      400,
    );
  }

  if (
    !/^[A-Za-z0-9._:-]+$/.test(
      normalized,
    )
  ) {
    throw new CheckoutOrderError(
      "INVALID_IDEMPOTENCY_KEY",

      "ساختار شناسه یکتای درخواست پرداخت معتبر نیست.",

      400,
    );
  }

  return normalized;
}

export function normalizeLocale(
  value:
    string,
): string {
  const normalized =
    value
      .trim()
      .toLowerCase();

  if (
    normalized !== "fa" &&
    normalized !== "en"
  ) {
    throw new CheckoutOrderError(
      "INVALID_LOCALE",

      "زبان سفارش معتبر نیست.",

      400,
    );
  }

  return normalized;
}

export function normalizeCustomer(
  customer:
    CheckoutCustomerInput,
): NormalizedCheckoutCustomer {
  try {
    return normalizeCheckoutCustomer(
      customer,
    );
  } catch (error) {
    if (
      error instanceof
      CheckoutCustomerError
    ) {
      throw new CheckoutOrderError(
        "INVALID_CUSTOMER",

        error.message,

        400,
      );
    }

    throw error;
  }
}

export function normalizeCheckoutItem(
  item:
    CheckoutOrderItemInput,
): CheckoutOrderItemInput {
  if (
    typeof item !==
      "object" ||
    item === null
  ) {
    throw new CheckoutOrderError(
      "INVALID_CART_ITEM",

      "حداقل یکی از اقلام سبد خرید معتبر نیست.",

      400,
    );
  }

  if (
    typeof item.slug !==
      "string"
  ) {
    throw new CheckoutOrderError(
      "INVALID_CART_ITEM",

      "شناسه محصول معتبر نیست.",

      400,
    );
  }

  const slug =
    item.slug.trim();

  if (
    !slug ||
    slug.length > 160
  ) {
    throw new CheckoutOrderError(
      "INVALID_CART_ITEM",

      "شناسه محصول معتبر نیست.",

      400,
    );
  }

  let variantId:
    string | null = null;

  if (
    typeof item.variantId ===
      "string"
  ) {
    variantId =
      item.variantId.trim() ||
      null;
  } else if (
    item.variantId !== null
  ) {
    throw new CheckoutOrderError(
      "INVALID_CART_ITEM",

      "شناسه مدل محصول معتبر نیست.",

      400,
    );
  }

  if (
    typeof item.quantity !==
      "number" ||
    !Number.isInteger(
      item.quantity,
    ) ||
    item.quantity < 1 ||
    item.quantity >
      MAX_ITEM_QUANTITY
  ) {
    throw new CheckoutOrderError(
      "INVALID_CART_ITEM",

      "تعداد محصول معتبر نیست.",

      400,
    );
  }

  return {
    slug,

    variantId,

    quantity:
      item.quantity,
  };
}

export function mergeDuplicateItems(
  items:
    CheckoutOrderItemInput[],
): CheckoutOrderItemInput[] {
  const merged =
    new Map<
      string,
      CheckoutOrderItemInput
    >();

  for (
    const item of items
  ) {
    const key =
      `${item.slug}::${item.variantId ?? ""}`;

    const existing =
      merged.get(key);

    if (!existing) {
      merged.set(
        key,
        {
          ...item,
        },
      );

      continue;
    }

    const mergedQuantity =
      existing.quantity +
      item.quantity;

    if (
      mergedQuantity >
      MAX_ITEM_QUANTITY
    ) {
      throw new CheckoutOrderError(
        "INVALID_CART_ITEM",

        "تعداد انتخاب‌شده برای یک محصول بیش از حد مجاز است.",

        400,
      );
    }

    existing.quantity =
      mergedQuantity;
  }

  return Array.from(
    merged.values(),
  );
}

export function toJsonValue(
  value:
    unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

export function generateOrderNumber(
  now =
    new Date(),
): string {
  const pad = (
    value:
      number,
  ) =>
    value
      .toString()
      .padStart(
        2,
        "0",
      );

  const timestamp = [
    now
      .getUTCFullYear()
      .toString()
      .slice(-2),

    pad(
      now.getUTCMonth() +
        1,
    ),

    pad(
      now.getUTCDate(),
    ),

    pad(
      now.getUTCHours(),
    ),

    pad(
      now.getUTCMinutes(),
    ),

    pad(
      now.getUTCSeconds(),
    ),
  ].join("");

  const randomPart =
    randomBytes(4)
      .toString("hex")
      .toUpperCase();

  return `ELR${timestamp}${randomPart}`;
}

export function getPrismaErrorCode(
  error:
    unknown,
): string | null {
  if (
    typeof error !==
      "object" ||
    error === null ||
    !("code" in error) ||
    typeof error.code !==
      "string"
  ) {
    return null;
  }

  return error.code;
}

export function serializeOrder(
  order:
    SerializableOrder,

  reused:
    boolean,
): CheckoutOrderResult {
  return {
    reused,

    order: {
      id:
        order.id,

      orderNumber:
        order.orderNumber,

      status:
        order.status,

      currency:
        "TOMAN",

      subtotalToman:
        order.subtotalToman.toString(),

      payableToman:
        order.payableToman.toString(),

      priceVerifiedAt:
        order.priceVerifiedAt.toISOString(),

      priceExpiresAt:
        order.priceExpiresAt.toISOString(),

      inventoryReservedAt:
        order.inventoryReservedAt.toISOString(),

      inventoryExpiresAt:
        order.inventoryExpiresAt.toISOString(),

      items:
        order.items.map(
          (
            item,
          ) => ({
            id:
              item.id,

            productSlug:
              item.productSlug,

            variantId:
              item.variantId,

            quantity:
              item.quantity,

            unitPriceToman:
              item.unitPriceToman.toString(),

            lineTotalToman:
              item.lineTotalToman.toString(),

            stockBeforeReservation:
              item.stockBeforeReservation,

            stockAfterReservation:
              item.stockAfterReservation,
          }),
        ),
    },
  };
}

export async function mapWithConcurrency<
  T,
  R,
>(
  items:
    T[],

  concurrency:
    number,

  mapper: (
    item:
      T,

    index:
      number,
  ) => Promise<R>,
): Promise<R[]> {
  if (
    items.length === 0
  ) {
    return [];
  }

  const output =
    new Array<R>(
      items.length,
    );

  let nextIndex =
    0;

  async function worker() {
    while (true) {
      const currentIndex =
        nextIndex;

      nextIndex +=
        1;

      if (
        currentIndex >=
        items.length
      ) {
        return;
      }

      output[currentIndex] =
        await mapper(
          items[currentIndex],
          currentIndex,
        );
    }
  }

  const workerCount =
    Math.min(
      Math.max(
        concurrency,
        1,
      ),
      items.length,
    );

  await Promise.all(
    Array.from(
      {
        length:
          workerCount,
      },

      () =>
        worker(),
    ),
  );

  return output;
}
