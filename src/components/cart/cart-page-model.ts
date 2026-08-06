import { readCartItems, type CartItem } from "@/lib/cart-storage";
export type QuotedCartItem = {
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

export type FailedCartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;
  code: string;
  message: string;
};

export type CartQuoteSummary = {
  uniqueItems: number;
  totalQuantity: number;
  subtotalToman: string;
  canCheckout: boolean;
};

export type CartQuoteResponse = {
  successful: true;
  currency: "TOMAN";
  items: QuotedCartItem[];
  failedItems: FailedCartItem[];
  summary: CartQuoteSummary;
  generatedAt: string;
};

export type LivePriceState =
  | "idle"
  | "refreshing"
  | "success"
  | "failed";

export type PriceChangeDirection =
  | "INCREASED"
  | "DECREASED"
  | "CHANGED";

export type PriceChangeNotice = {
  id: number;
  direction: PriceChangeDirection;
  changedItemsCount: number;
  previousSubtotalToman: string;
  currentSubtotalToman: string;
  differenceToman: string;
};

export type QuoteLoadOptions = {
  background?: boolean;
  notifyOnPriceChange?: boolean;
};

export type CartPageClientProps = {
  locale: string;
  persianTitleClassName: string;
};

export function getCartSnapshot(): string {
  return JSON.stringify(readCartItems());
}

export function getServerCartSnapshot(): string {
  return "[]";
}

export function parseCartSnapshot(
  snapshot: string,
): CartItem[] {
  try {
    const parsed: unknown =
      JSON.parse(snapshot);

    return Array.isArray(parsed)
      ? (parsed as CartItem[])
      : [];
  } catch {
    return [];
  }
}

export function isCartQuoteResponse(
  value: unknown,
): value is CartQuoteResponse {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Partial<CartQuoteResponse>;

  return (
    candidate.successful === true &&
    Array.isArray(candidate.items) &&
    Array.isArray(
      candidate.failedItems,
    ) &&
    typeof candidate.summary ===
      "object" &&
    candidate.summary !== null &&
    typeof candidate.generatedAt ===
      "string"
  );
}

export function isSameItem(
  first: {
    slug: string;
    variantId: string | null;
  },
  second: {
    slug: string;
    variantId: string | null;
  },
) {
  return (
    first.slug === second.slug &&
    first.variantId === second.variantId
  );
}

export function getItemKey(item: {
  slug: string;
  variantId: string | null;
}) {
  return `${item.slug}:${item.variantId ?? "default"}`;
}

export function parseToman(
  value: string,
): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

export function detectPriceChange(
  previousQuote: CartQuoteResponse,
  currentQuote: CartQuoteResponse,
): PriceChangeNotice | null {
  const previousPrices =
    new Map<string, string>();

  for (const item of previousQuote.items) {
    previousPrices.set(
      getItemKey(item),
      item.pricing.unitPriceToman,
    );
  }

  let changedItemsCount = 0;

  for (const item of currentQuote.items) {
    const previousPrice =
      previousPrices.get(
        getItemKey(item),
      );

    if (
      previousPrice !== undefined &&
      previousPrice !==
        item.pricing.unitPriceToman
    ) {
      changedItemsCount += 1;
    }
  }

  if (changedItemsCount === 0) {
    return null;
  }

  const previousSubtotal =
    parseToman(
      previousQuote.summary
        .subtotalToman,
    );

  const currentSubtotal =
    parseToman(
      currentQuote.summary
        .subtotalToman,
    );

  if (
    previousSubtotal === null ||
    currentSubtotal === null
  ) {
    return {
      id: Date.now(),
      direction: "CHANGED",
      changedItemsCount,
      previousSubtotalToman:
        previousQuote.summary
          .subtotalToman,
      currentSubtotalToman:
        currentQuote.summary
          .subtotalToman,
      differenceToman: "0",
    };
  }

  const difference =
    currentSubtotal -
    previousSubtotal;

  const absoluteDifference =
    difference < BigInt(0)
      ? difference * BigInt(-1)
      : difference;

  const direction:
    PriceChangeDirection =
    difference > BigInt(0)
      ? "INCREASED"
      : difference < BigInt(0)
        ? "DECREASED"
        : "CHANGED";

  return {
    id: Date.now(),
    direction,
    changedItemsCount,
    previousSubtotalToman:
      previousSubtotal.toString(),
    currentSubtotalToman:
      currentSubtotal.toString(),
    differenceToman:
      absoluteDifference.toString(),
  };
}

export function calculateSummary(
  items: QuotedCartItem[],
  failedItems: FailedCartItem[],
): CartQuoteSummary {
  const subtotalToman =
    items.reduce(
      (total, item) => {
        if (!item.canPurchase) {
          return total;
        }

        try {
          return (
            total +
            BigInt(
              item.pricing
                .lineTotalToman,
            )
          );
        } catch {
          return total;
        }
      },
      BigInt(0),
    );

  const totalQuantity =
    items.reduce(
      (total, item) =>
        total + item.quantity,
      0,
    );

  return {
    uniqueItems: items.length,
    totalQuantity,
    subtotalToman:
      subtotalToman.toString(),
    canCheckout:
      items.length > 0 &&
      failedItems.length === 0 &&
      items.every(
        (item) =>
          item.canPurchase,
      ),
  };
}
