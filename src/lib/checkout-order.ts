import {
  randomBytes,
} from "node:crypto";

import {
  Prisma,
} from "@/generated/prisma/client";

import {
  CheckoutCustomerError,
  normalizeCheckoutCustomer,
  type CheckoutCustomerInput,
  type NormalizedCheckoutCustomer,
} from "@/lib/checkout-customer";

import {
  getProductLivePrice,
  ProductPricingError,
  type ProductPriceResult,
} from "@/lib/product-pricing";

import {
  prisma,
} from "@/lib/prisma";

import { syncProductInventory } from "@/lib/inventory";

const MAX_CART_ITEMS =
  30;

const MAX_ITEM_QUANTITY =
  99;

const INVENTORY_RESERVATION_MINUTES =
  15;

const TRANSACTION_RETRY_COUNT =
  3;

export type CheckoutOrderItemInput = {
  slug: string;

  variantId:
    string | null;

  quantity:
    number;
};

export type CreateCheckoutOrderInput = {
  idempotencyKey:
    string;

  locale:
    string;

  customer:
    CheckoutCustomerInput;

  items:
    CheckoutOrderItemInput[];

  requestId?:
    string | null;
};

export type CheckoutOrderResult = {
  reused:
    boolean;

  order: {
    id:
      string;

    orderNumber:
      string;

    status:
      string;

    currency:
      "TOMAN";

    subtotalToman:
      string;

    payableToman:
      string;

    priceVerifiedAt:
      string;

    priceExpiresAt:
      string;

    inventoryReservedAt:
      string;

    inventoryExpiresAt:
      string;

    items: Array<{
      id:
        string;

      productSlug:
        string;

      variantId:
        string | null;

      quantity:
        number;

      unitPriceToman:
        string;

      lineTotalToman:
        string;

      stockBeforeReservation:
        number;

      stockAfterReservation:
        number;
    }>;
  };
};

export type CheckoutOrderErrorCode =
  | "INVALID_IDEMPOTENCY_KEY"
  | "INVALID_LOCALE"
  | "INVALID_CUSTOMER"
  | "INVALID_CART"
  | "INVALID_CART_ITEM"
  | "TOO_MANY_ITEMS"
  | "PRODUCT_UNAVAILABLE"
  | "INSUFFICIENT_STOCK"
  | "PENDING_ORDER_LIMIT"
  | "PRICE_EXPIRED"
  | "PRICING_FAILED"
  | "TRANSACTION_FAILED";

export class CheckoutOrderError extends Error {
  readonly code:
    CheckoutOrderErrorCode;

  readonly status:
    number;

  constructor(
    code:
      CheckoutOrderErrorCode,

    message:
      string,

    status =
      400,
  ) {
    super(message);

    this.name =
      "CheckoutOrderError";

    this.code =
      code;

    this.status =
      status;
  }
}

type PricedCheckoutItem = {
  input:
    CheckoutOrderItemInput;

  result:
    ProductPriceResult;

  unitPriceToman:
    string;

  lineTotalToman:
    string;

  pricingSnapshot:
    Prisma.InputJsonValue;
};

type ReservedCheckoutItem = {
  pricedItem:
    PricedCheckoutItem;

  stockBeforeReservation:
    number;

  stockAfterReservation:
    number;
};

type SerializableOrder = {
  id:
    string;

  orderNumber:
    string;

  status:
    string;

  currency:
    string;

  subtotalToman: {
    toString():
      string;
  };

  payableToman: {
    toString():
      string;
  };

  priceVerifiedAt:
    Date;

  priceExpiresAt:
    Date;

  inventoryReservedAt:
    Date;

  inventoryExpiresAt:
    Date;

  items: Array<{
    id:
      string;

    productSlug:
      string;

    variantId:
      string | null;

    quantity:
      number;

    unitPriceToman: {
      toString():
        string;
    };

    lineTotalToman: {
      toString():
        string;
    };

    stockBeforeReservation:
      number;

    stockAfterReservation:
      number;
  }>;
};

function normalizeIdempotencyKey(
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

function normalizeLocale(
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

function normalizeCustomer(
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

function normalizeCheckoutItem(
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

function mergeDuplicateItems(
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

function toJsonValue(
  value:
    unknown,
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value),
  ) as Prisma.InputJsonValue;
}

function generateOrderNumber(
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

function getPrismaErrorCode(
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

function serializeOrder(
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

async function mapWithConcurrency<
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

async function priceCheckoutItem(
  item:
    CheckoutOrderItemInput,
): Promise<PricedCheckoutItem> {
  try {
    const result =
      await getProductLivePrice({
        slug:
          item.slug,

        variantId:
          item.variantId,
      });

    if (
      !result.product
        .isPurchasable
    ) {
      throw new CheckoutOrderError(
        "PRODUCT_UNAVAILABLE",

        `محصول «${result.product.nameFa}» در حال حاضر قابل سفارش نیست.`,

        409,
      );
    }

    const availableStock =
      result.variant
        ?.stock ??
      result.product.stock;

    if (
      availableStock <
      item.quantity
    ) {
      throw new CheckoutOrderError(
        "INSUFFICIENT_STOCK",

        `موجودی محصول «${result.product.nameFa}» برای تعداد انتخاب‌شده کافی نیست.`,

        409,
      );
    }

    const unitPriceToman =
      result.pricing
        .finalPriceToman;

    const lineTotalToman =
      (
        BigInt(
          unitPriceToman,
        ) *
        BigInt(
          item.quantity,
        )
      ).toString();

    return {
      input:
        item,

      result,

      unitPriceToman,

      lineTotalToman,

      pricingSnapshot:
        toJsonValue({
          product:
            result.product,

          variant:
            result.variant,

          pricing:
            result.pricing,

          liveRate:
            result.liveRate,

          policy:
            result.policy,

          quote:
            result.quote,

          quantity:
            item.quantity,

          unitPriceToman,

          lineTotalToman,
        }),
    };
  } catch (error) {
    if (
      error instanceof
      CheckoutOrderError
    ) {
      throw error;
    }

    if (
      error instanceof
      ProductPricingError
    ) {
      throw new CheckoutOrderError(
        "PRICING_FAILED",

        error.message,

        error.status,
      );
    }

    throw error;
  }
}

async function findExistingOrder(
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

export async function createCheckoutOrder({
  idempotencyKey,
  locale,
  customer,
  items,
  requestId = null,
}: CreateCheckoutOrderInput): Promise<CheckoutOrderResult> {
  const normalizedIdempotencyKey =
    normalizeIdempotencyKey(
      idempotencyKey,
    );

  const normalizedLocale =
    normalizeLocale(
      locale,
    );

  const normalizedCustomer =
    normalizeCustomer(
      customer,
    );

  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    throw new CheckoutOrderError(
      "INVALID_CART",

      "سبد خرید خالی یا نامعتبر است.",

      400,
    );
  }

  if (
    items.length >
    MAX_CART_ITEMS
  ) {
    throw new CheckoutOrderError(
      "TOO_MANY_ITEMS",

      "تعداد اقلام سبد خرید بیش از حد مجاز است.",

      400,
    );
  }

  const existingOrder =
    await findExistingOrder(
      normalizedIdempotencyKey,
    );

  if (
    existingOrder
  ) {
    return existingOrder;
  }

  const normalizedItems =
    mergeDuplicateItems(
      items.map(
        normalizeCheckoutItem,
      ),
    );

  if (
    normalizedItems.length >
    MAX_CART_ITEMS
  ) {
    throw new CheckoutOrderError(
      "TOO_MANY_ITEMS",

      "حداکثر ۳۰ محصول متفاوت می‌تواند در سفارش وجود داشته باشد.",

      400,
    );
  }

  const pricedItems =
    await mapWithConcurrency(
      normalizedItems,
      2,
      priceCheckoutItem,
    );

  const subtotalToman =
    pricedItems.reduce(
      (
        total,
        item,
      ) =>
        total +
        BigInt(
          item.lineTotalToman,
        ),

      BigInt(0),
    );

  if (
    subtotalToman <=
    BigInt(0)
  ) {
    throw new CheckoutOrderError(
      "PRICING_FAILED",

      "مبلغ سفارش معتبر نیست.",

      422,
    );
  }

  const quoteExpirationTimes =
    pricedItems.map(
      (
        item,
      ) =>
        new Date(
          item.result.quote
            .expiresAt,
        ).getTime(),
    );

  if (
    quoteExpirationTimes.some(
      (
        value,
      ) =>
        !Number.isFinite(
          value,
        ),
    )
  ) {
    throw new CheckoutOrderError(
      "PRICING_FAILED",

      "زمان اعتبار قیمت سفارش معتبر نیست.",

      500,
    );
  }

  const priceExpiresAt =
    new Date(
      Math.min(
        ...quoteExpirationTimes,
      ),
    );

  const priceVerifiedAt =
    new Date();

  if (
    priceExpiresAt.getTime() <=
    priceVerifiedAt.getTime()
  ) {
    throw new CheckoutOrderError(
      "PRICE_EXPIRED",

      "اعتبار قیمت سفارش پایان یافته است. قیمت‌ها باید دوباره بررسی شوند.",

      409,
    );
  }

  const inventoryExpiresAt =
    new Date(
      priceVerifiedAt.getTime() +
        INVENTORY_RESERVATION_MINUTES *
          60_000,
    );

  const orderPricingSnapshot =
    toJsonValue({
      currency:
        "TOMAN",

      subtotalToman:
        subtotalToman.toString(),

      shippingToman:
        "0",

      discountToman:
        "0",

      payableToman:
        subtotalToman.toString(),

      priceVerifiedAt:
        priceVerifiedAt.toISOString(),

      priceExpiresAt:
        priceExpiresAt.toISOString(),

      customer: {
        fullName:
          normalizedCustomer.fullName,

        mobile:
          normalizedCustomer.mobile,

        email:
          normalizedCustomer.email,

        province:
          normalizedCustomer.province,

        city:
          normalizedCustomer.city,

        postalCode:
          normalizedCustomer.postalCode,

        address:
          normalizedCustomer.address,
      },

      items:
        pricedItems.map(
          (
            item,
          ) => ({
            slug:
              item.result.product
                .slug,

            productId:
              item.result.product
                .id,

            variantId:
              item.result.variant
                ?.id ??
              null,

            quantity:
              item.input.quantity,

            unitPriceToman:
              item.unitPriceToman,

            lineTotalToman:
              item.lineTotalToman,

            pricing:
              item.result.pricing,

            liveRate:
              item.result.liveRate,

            policy:
              item.result.policy,

            quote:
              item.result.quote,
          }),
        ),
    });

  for (
    let attempt =
      1;

    attempt <=
      TRANSACTION_RETRY_COUNT;

    attempt +=
      1
  ) {
    try {
      const transactionResult =
        await prisma.$transaction(
          async (
            transaction,
          ) => {
            const orderAlreadyCreated =
              await transaction.order.findUnique({
                where: {
                  idempotencyKey:
                    normalizedIdempotencyKey,
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
              orderAlreadyCreated
            ) {
              return {
                reused:
                  true,

                order:
                  orderAlreadyCreated,
              };
            }

            await transaction.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${normalizedCustomer.mobile}))`;

            const activeReservationCount = await transaction.order.count({
              where: {
                customerMobile: normalizedCustomer.mobile,
                status: { in: ["PENDING_PAYMENT", "PAYMENT_FAILED"] },
                inventoryReleasedAt: null,
                inventoryExpiresAt: { gt: new Date() },
              },
            });

            if (activeReservationCount >= 3) {
              throw new CheckoutOrderError(
                "PENDING_ORDER_LIMIT",
                "ابتدا یکی از سفارش‌های در انتظار پرداخت قبلی را تکمیل کنید.",
                409,
              );
            }

            if (
              priceExpiresAt.getTime() <=
              Date.now()
            ) {
              throw new CheckoutOrderError(
                "PRICE_EXPIRED",

                "اعتبار قیمت سفارش پایان یافته است. قیمت‌ها باید دوباره بررسی شوند.",

                409,
              );
            }

            const reservedItems:
              ReservedCheckoutItem[] =
                [];

            for (
              const pricedItem of
              pricedItems
            ) {
              const quantity =
                pricedItem.input
                  .quantity;

              const productId =
                pricedItem.result
                  .product.id;

              const selectedVariant =
                pricedItem.result
                  .variant;

              if (
                selectedVariant
              ) {
                const currentVariant =
                  await transaction.productVariant.findUnique({
                    where: {
                      id:
                        selectedVariant.id,
                    },

                    select: {
                      productId:
                        true,

                      stock:
                        true,

                      isActive:
                        true,
                    },
                  });

                if (
                  !currentVariant ||
                  !currentVariant.isActive ||
                  currentVariant.productId !==
                    productId
                ) {
                  throw new CheckoutOrderError(
                    "PRODUCT_UNAVAILABLE",

                    `مدل انتخاب‌شده محصول «${pricedItem.result.product.nameFa}» دیگر قابل سفارش نیست.`,

                    409,
                  );
                }

                const currentProduct =
                  await transaction.product.findUnique({
                    where: {
                      id: productId,
                    },
                    select: {
                      status: true,
                      stock: true,
                    },
                  });

                if (
                  !currentProduct ||
                  currentProduct.status !== "ACTIVE" ||
                  currentProduct.stock < quantity
                ) {
                  throw new CheckoutOrderError(
                    "INSUFFICIENT_STOCK",
                    `موجودی کلی محصول «${pricedItem.result.product.nameFa}» تغییر کرده است.`,
                    409,
                  );
                }

                const reservation =
                  await transaction.productVariant.updateMany({
                    where: {
                      id:
                        selectedVariant.id,

                      productId,

                      isActive:
                        true,

                      stock: {
                        gte:
                          quantity,
                      },
                    },

                    data: {
                      stock: {
                        decrement:
                          quantity,
                      },
                    },
                  });

                if (
                  reservation.count !==
                  1
                ) {
                  throw new CheckoutOrderError(
                    "INSUFFICIENT_STOCK",

                    `موجودی محصول «${pricedItem.result.product.nameFa}» تغییر کرده است.`,

                    409,
                  );
                }

                await syncProductInventory(transaction, productId);

                reservedItems.push({
                  pricedItem,

                  stockBeforeReservation:
                    currentVariant.stock,

                  stockAfterReservation:
                    currentVariant.stock -
                    quantity,
                });

                continue;
              }

              const currentProduct =
                await transaction.product.findUnique({
                  where: {
                    id:
                      productId,
                  },

                  select: {
                    status:
                      true,

                    stock:
                      true,
                  },
                });

              if (
                !currentProduct ||
                currentProduct.status !==
                  "ACTIVE"
              ) {
                throw new CheckoutOrderError(
                  "PRODUCT_UNAVAILABLE",

                  `محصول «${pricedItem.result.product.nameFa}» دیگر قابل سفارش نیست.`,

                  409,
                );
              }

              const reservation =
                await transaction.product.updateMany({
                  where: {
                    id:
                      productId,

                    status:
                      "ACTIVE",

                    stock: {
                      gte:
                        quantity,
                    },
                  },

                  data: {
                    stock: {
                      decrement:
                        quantity,
                    },
                  },
                });

              if (
                reservation.count !==
                1
              ) {
                throw new CheckoutOrderError(
                  "INSUFFICIENT_STOCK",

                  `موجودی محصول «${pricedItem.result.product.nameFa}» تغییر کرده است.`,

                  409,
                );
              }

              if (currentProduct.stock - quantity === 0) {
                await transaction.product.updateMany({
                  where: { id: productId, stock: 0, status: "ACTIVE" },
                  data: { status: "OUT_OF_STOCK" },
                });
              }

              reservedItems.push({
                pricedItem,

                stockBeforeReservation:
                  currentProduct.stock,

                stockAfterReservation:
                  currentProduct.stock -
                  quantity,
              });
            }

            const createdOrder =
              await transaction.order.create({
                data: {
                  orderNumber:
                    generateOrderNumber(),

                  idempotencyKey:
                    normalizedIdempotencyKey,

                  locale:
                    normalizedLocale,

                  currency:
                    "TOMAN",

                  status:
                    "PENDING_PAYMENT",

                  customerFullName:
                    normalizedCustomer.fullName,

                  customerMobile:
                    normalizedCustomer.mobile,

                  customerEmail:
                    normalizedCustomer.email,

                  province:
                    normalizedCustomer.province,

                  city:
                    normalizedCustomer.city,

                  postalCode:
                    normalizedCustomer.postalCode,

                  address:
                    normalizedCustomer.address,

                  subtotalToman:
                    subtotalToman.toString(),

                  shippingToman:
                    "0",

                  discountToman:
                    "0",

                  payableToman:
                    subtotalToman.toString(),

                  pricingSnapshot:
                    orderPricingSnapshot,

                  priceVerifiedAt,

                  priceExpiresAt,

                  inventoryReservedAt:
                    priceVerifiedAt,

                  inventoryExpiresAt,

                  items: {
                    create:
                      reservedItems.map(
                        (
                          reservedItem,
                        ) => {
                          const {
                            pricedItem,
                            stockBeforeReservation,
                            stockAfterReservation,
                          } =
                            reservedItem;

                          const {
                            result,
                            input,
                          } =
                            pricedItem;

                          const breakdown =
                            result.pricing
                              .breakdown;

                          return {
                            productId:
                              result.product
                                .id,

                            variantId:
                              result.variant
                                ?.id ??
                              null,

                            productSlug:
                              result.product
                                .slug,

                            productSku:
                              result.product
                                .sku,

                            productNameFa:
                              result.product
                                .nameFa,

                            productNameEn:
                              result.product
                                .nameEn,

                            variantTitleFa:
                              result.variant
                                ?.titleFa ??
                              null,

                            variantTitleEn:
                              result.variant
                                ?.titleEn ??
                              null,

                            variantSku:
                              result.variant
                                ?.sku ??
                              null,

                            material:
                              result.product
                                .material,

                            quantity:
                              input.quantity,

                            unitPriceToman:
                              pricedItem.unitPriceToman,

                            lineTotalToman:
                              pricedItem.lineTotalToman,

                            metalValueToman:
                              breakdown
                                ?.metalValueToman ??
                              null,

                            makingChargeToman:
                              breakdown
                                ?.makingChargeTotalToman ??
                              null,

                            artisticFeeToman:
                              breakdown
                                ?.artisticFeeToman ??
                              null,

                            profitToman:
                              breakdown
                                ?.profitToman ??
                              null,

                            taxToman:
                              breakdown
                                ?.taxToman ??
                              null,

                            originalMetalRateToman:
                              result.liveRate
                                ?.originalPricePerGramToman ??
                              null,

                            effectiveMetalRateToman:
                              result.liveRate
                                ?.effectivePricePerGramToman ??
                              null,

                            metalRateMode:
                              result.liveRate
                                ?.saleMode ??
                              null,

                            metalRateReason:
                              result.liveRate
                                ?.saleReason ??
                              null,

                            safetyMarginPercent:
                              result.liveRate
                                ?.appliedSafetyMarginPercent ??
                              null,

                            safetyMarginToman:
                              result.liveRate
                                ?.safetyMarginAmountToman ??
                              null,

                            stockBeforeReservation,

                            stockAfterReservation,

                            pricingSnapshot:
                              pricedItem.pricingSnapshot,
                          };
                        },
                      ),
                  },

                  auditEvents: {
                    create: {
                      actorType:
                        "CUSTOMER",

                      eventType:
                        "CHECKOUT_ORDER_CREATED",

                      requestId:
                        requestId
                          ?.trim()
                          .slice(
                            0,
                            128,
                          ) ||
                        null,

                      payload:
                        toJsonValue({
                          idempotencyKey:
                            normalizedIdempotencyKey,

                          customerMobile:
                            normalizedCustomer.mobile,

                          itemCount:
                            reservedItems.length,

                          totalQuantity:
                            reservedItems.reduce(
                              (
                                total,
                                item,
                              ) =>
                                total +
                                item.pricedItem
                                  .input
                                  .quantity,

                              0,
                            ),

                          subtotalToman:
                            subtotalToman.toString(),

                          payableToman:
                            subtotalToman.toString(),

                          priceExpiresAt:
                            priceExpiresAt.toISOString(),

                          inventoryExpiresAt:
                            inventoryExpiresAt.toISOString(),
                        }),
                    },
                  },
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

            return {
              reused:
                false,

              order:
                createdOrder,
            };
          },
          {
            isolationLevel:
              "Serializable",

            maxWait:
              15_000,

            timeout:
              45_000,
          },
        );

      return serializeOrder(
        transactionResult.order,
        transactionResult.reused,
      );
    } catch (error) {
      if (
        error instanceof
        CheckoutOrderError
      ) {
        throw error;
      }

      const prismaErrorCode =
        getPrismaErrorCode(
          error,
        );

      if (
        prismaErrorCode ===
        "P2002"
      ) {
        const orderCreatedByConcurrentRequest =
          await findExistingOrder(
            normalizedIdempotencyKey,
          );

        if (
          orderCreatedByConcurrentRequest
        ) {
          return orderCreatedByConcurrentRequest;
        }
      }

      if (
        prismaErrorCode ===
          "P2034" &&
        attempt <
          TRANSACTION_RETRY_COUNT
      ) {
        continue;
      }

      console.error(
        "[Eloria Checkout] Unable to create checkout order.",
        error,
      );

      throw new CheckoutOrderError(
        "TRANSACTION_FAILED",

        "ثبت سفارش در حال حاضر امکان‌پذیر نیست. لطفاً دوباره تلاش کنید.",

        500,
      );
    }
  }

  throw new CheckoutOrderError(
    "TRANSACTION_FAILED",

    "ثبت سفارش در حال حاضر امکان‌پذیر نیست. لطفاً دوباره تلاش کنید.",

    500,
  );
}