import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getProductLivePrice,
  ProductPricingError,
} from "@/lib/product-pricing";

import {
  prisma,
} from "@/lib/prisma";

import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";

import {
  hasTrustedOrigin,
  requestIp,
} from "@/lib/security/request";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

type IncomingCartItem = {
  slug?: unknown;
  variantId?: unknown;
  quantity?: unknown;
};

type ValidCartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;
};

type QuotedCartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;

  product: {
    id: string;
    nameFa: string;
    nameEn: string;
    material: "GOLD" | "SILVER";
    sku: string | null;
    stock: number;
    isPurchasable: boolean;
  };

  variant: {
    id: string;
    titleFa: string;
    titleEn: string;
    sku: string | null;
    stock: number;
  } | null;

  image: {
    url: string;
    altFa: string | null;
    altEn: string | null;
  } | null;

  pricing: {
    currency: "TOMAN";
    unitPriceToman: string;
    lineTotalToman: string;
  };

  canPurchase: boolean;
  unavailableReason: string | null;
};

type FailedCartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;
  code: string;
  message: string;
};

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
  };
}

function normalizeCartItem(
  item: IncomingCartItem,
): ValidCartItem | null {
  if (
    typeof item !== "object" ||
    item === null
  ) {
    return null;
  }

  if (
    typeof item.slug !==
    "string"
  ) {
    return null;
  }

  const slug =
    item.slug.trim();

  if (
    !slug ||
    slug.length > 160
  ) {
    return null;
  }

  let variantId:
    string | null = null;

  if (
    typeof item.variantId ===
    "string"
  ) {
    const normalizedVariantId =
      item.variantId.trim();

    variantId =
      normalizedVariantId ||
      null;
  } else if (
    item.variantId !==
      null &&
    item.variantId !==
      undefined
  ) {
    return null;
  }

  if (
    typeof item.quantity !==
      "number" ||
    !Number.isInteger(
      item.quantity,
    )
  ) {
    return null;
  }

  const quantity =
    Math.min(
      Math.max(
        item.quantity,
        1,
      ),
      99,
    );

  return {
    slug,
    variantId,
    quantity,
  };
}

function mergeDuplicateItems(
  items: ValidCartItem[],
): ValidCartItem[] {
  const merged =
    new Map<
      string,
      ValidCartItem
    >();

  for (const item of items) {
    const key =
      `${item.slug}::${item.variantId ?? ""}`;

    const existing =
      merged.get(key);

    if (existing) {
      existing.quantity =
        Math.min(
          existing.quantity +
            item.quantity,
          99,
        );

      continue;
    }

    merged.set(
      key,
      {
        ...item,
      },
    );
  }

  return Array.from(
    merged.values(),
  );
}

async function mapWithConcurrency<
  T,
  R,
>(
  items: T[],
  concurrency: number,
  mapper: (
    item: T,
    index: number,
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

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex =
        nextIndex;

      nextIndex += 1;

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
      () => worker(),
    ),
  );

  return output;
}

async function quoteCartItem(
  item: ValidCartItem,
): Promise<
  | {
      successful: true;
      item: QuotedCartItem;
    }
  | {
      successful: false;
      item: FailedCartItem;
    }
> {
  try {
    const result =
      await getProductLivePrice({
        slug:
          item.slug,

        variantId:
          item.variantId,
      });

    const image =
      await prisma.productImage.findFirst({
        where: {
          productId:
            result.product.id,
        },

        orderBy: [
          {
            isPrimary:
              "desc",
          },
          {
            displayOrder:
              "asc",
          },
        ],

        select: {
          imageUrl: true,
          altFa: true,
          altEn: true,
        },
      });

    const selectedStock =
      result.variant
        ?.stock ??
      result.product.stock;

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

    const hasEnoughStock =
      selectedStock >=
      item.quantity;

    const canPurchase =
      result.product
        .isPurchasable &&
      hasEnoughStock;

    let unavailableReason:
      string | null = null;

    if (
      !result.product
        .isPurchasable
    ) {
      unavailableReason =
        "PRODUCT_UNAVAILABLE";
    } else if (
      !hasEnoughStock
    ) {
      unavailableReason =
        "INSUFFICIENT_STOCK";
    }

    return {
      successful: true,

      item: {
        slug:
          result.product.slug,

        variantId:
          result.variant
            ?.id ?? null,

        quantity:
          item.quantity,

        product: {
          id:
            result.product.id,

          nameFa:
            result.product
              .nameFa,

          nameEn:
            result.product
              .nameEn,

          material:
            result.product
              .material,

          sku:
            result.product.sku,

          stock:
            result.product.stock,

          isPurchasable:
            result.product
              .isPurchasable,
        },

        variant:
          result.variant
            ? {
                id:
                  result.variant
                    .id,

                titleFa:
                  result.variant
                    .titleFa,

                titleEn:
                  result.variant
                    .titleEn,

                sku:
                  result.variant
                    .sku,

                stock:
                  result.variant
                    .stock,
              }
            : null,

        image:
          image
            ? {
                url:
                  image.imageUrl,

                altFa:
                  image.altFa,

                altEn:
                  image.altEn,
              }
            : null,

        pricing: {
          currency:
            "TOMAN",

          unitPriceToman,

          lineTotalToman,
        },

        canPurchase,

        unavailableReason,
      },
    };
  } catch (error) {
    if (
      error instanceof
        ProductPricingError
    ) {
      return {
        successful:
          false,

        item: {
          slug:
            item.slug,

          variantId:
            item.variantId,

          quantity:
            item.quantity,

          code:
            error.code,

          message:
            error.message,
        },
      };
    }

    console.error(
      `[Eloria Cart] Unable to quote "${item.slug}".`,
      error,
    );

    return {
      successful:
        false,

      item: {
        slug:
          item.slug,

        variantId:
          item.variantId,

        quantity:
          item.quantity,

        code:
          "INTERNAL_ERROR",

        message:
          "محاسبه قیمت این محصول در حال حاضر امکان‌پذیر نیست.",
      },
    };
  }
}

export async function POST(
  request: NextRequest,
) {
  if (!hasTrustedOrigin(request)) {
    return NextResponse.json(
      { successful: false, code: "FORBIDDEN_ORIGIN", message: "مبدأ درخواست معتبر نیست." },
      { status: 403, headers: noStoreHeaders() },
    );
  }

  const rate = await consumeRateLimit({
    key: `cart-quote:${requestIp(request)}`,
    limit: 30,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { successful: false, code: "RATE_LIMITED", message: "تعداد درخواست‌های بررسی قیمت بیش از حد مجاز است." },
      { status: 429, headers: { ...noStoreHeaders(), "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    let body: unknown;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          successful: false,
          code:
            "INVALID_JSON",
          message:
            "ساختار اطلاعات سبد خرید معتبر نیست.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      typeof body !==
        "object" ||
      body === null ||
      !(
        "items" in body
      ) ||
      !Array.isArray(
        body.items,
      )
    ) {
      return NextResponse.json(
        {
          successful: false,
          code:
            "INVALID_CART",
          message:
            "سبد خرید معتبر نیست.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    if (
      body.items.length >
      50
    ) {
      return NextResponse.json(
        {
          successful: false,
          code:
            "TOO_MANY_ITEMS",
          message:
            "تعداد اقلام سبد خرید بیش از حد مجاز است.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const normalizedItems =
      body.items
        .map((item) =>
          normalizeCartItem(
            item as IncomingCartItem,
          ),
        )
        .filter(
          (
            item,
          ): item is ValidCartItem =>
            item !== null,
        );

    if (
      normalizedItems.length !==
      body.items.length
    ) {
      return NextResponse.json(
        {
          successful: false,
          code:
            "INVALID_CART_ITEM",
          message:
            "حداقل یکی از اقلام سبد خرید معتبر نیست.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const mergedItems =
      mergeDuplicateItems(
        normalizedItems,
      );

    if (
      mergedItems.length >
      30
    ) {
      return NextResponse.json(
        {
          successful: false,
          code:
            "TOO_MANY_UNIQUE_ITEMS",
          message:
            "حداکثر ۳۰ محصول متفاوت می‌تواند در سبد خرید باشد.",
        },
        {
          status: 400,
          headers:
            noStoreHeaders(),
        },
      );
    }

    const results =
      await mapWithConcurrency(
        mergedItems,
        2,
        quoteCartItem,
      );

    const quotedItems =
      results
        .filter(
          (
            result,
          ): result is {
            successful: true;
            item: QuotedCartItem;
          } =>
            result.successful,
        )
        .map(
          (result) =>
            result.item,
        );

    const failedItems =
      results
        .filter(
          (
            result,
          ): result is {
            successful: false;
            item: FailedCartItem;
          } =>
            !result.successful,
        )
        .map(
          (result) =>
            result.item,
        );

    const subtotalToman =
      quotedItems.reduce(
        (
          total,
          item,
        ) => {
          if (
            !item.canPurchase
          ) {
            return total;
          }

          return (
            total +
            BigInt(
              item.pricing
                .lineTotalToman,
            )
          );
        },
        BigInt(0),
      );

    const totalQuantity =
      quotedItems.reduce(
        (
          total,
          item,
        ) =>
          total +
          item.quantity,
        0,
      );

    const canCheckout =
      mergedItems.length >
        0 &&
      failedItems.length ===
        0 &&
      quotedItems.every(
        (item) =>
          item.canPurchase,
      );

    return NextResponse.json(
      {
        successful: true,

        currency:
          "TOMAN",

        items:
          quotedItems,

        failedItems,

        summary: {
          uniqueItems:
            quotedItems.length,

          totalQuantity,

          subtotalToman:
            subtotalToman.toString(),

          canCheckout,
        },

        generatedAt:
          new Date().toISOString(),
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "[Eloria Cart] Unexpected quote error.",
      error,
    );

    return NextResponse.json(
      {
        successful: false,
        code:
          "INTERNAL_ERROR",
        message:
          "دریافت اطلاعات سبد خرید امکان‌پذیر نیست.",
      },
      {
        status: 500,
        headers:
          noStoreHeaders(),
      },
    );
  }
}