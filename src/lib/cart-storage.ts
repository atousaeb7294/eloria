"use client";

export const CART_STORAGE_KEY =
  "eloria-cart-v1";

export const CART_UPDATED_EVENT =
  "eloria-cart-updated";

export type CartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;
  addedAt: string;
};

function isCartItem(
  value: unknown,
): value is CartItem {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const item =
    value as Partial<CartItem>;

  return (
    typeof item.slug ===
      "string" &&
    item.slug.trim().length > 0 &&
    (
      typeof item.variantId ===
        "string" ||
      item.variantId === null
    ) &&
    typeof item.quantity ===
      "number" &&
    Number.isInteger(
      item.quantity,
    ) &&
    item.quantity > 0 &&
    typeof item.addedAt ===
      "string"
  );
}

function notifyCartUpdated(
  items: CartItem[],
) {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(
      CART_UPDATED_EVENT,
      {
        detail: {
          items,
          totalQuantity:
            items.reduce(
              (
                total,
                item,
              ) =>
                total +
                item.quantity,
              0,
            ),
        },
      },
    ),
  );
}

export function readCartItems(): CartItem[] {
  if (
    typeof window ===
    "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        CART_STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed: unknown =
      JSON.parse(raw);

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      return [];
    }

    return parsed.filter(
      isCartItem,
    );
  } catch {
    return [];
  }
}

export function writeCartItems(
  items: CartItem[],
): void {
  if (
    typeof window ===
    "undefined"
  ) {
    return;
  }

  const validItems =
    items.filter(
      isCartItem,
    );

  window.localStorage.setItem(
    CART_STORAGE_KEY,
    JSON.stringify(
      validItems,
    ),
  );

  notifyCartUpdated(
    validItems,
  );
}

export function addCartItem({
  slug,
  variantId = null,
  quantity = 1,
}: {
  slug: string;
  variantId?: string | null;
  quantity?: number;
}): CartItem[] {
  const normalizedSlug =
    slug.trim();

  if (!normalizedSlug) {
    return readCartItems();
  }

  const safeQuantity =
    Math.min(
      Math.max(
        Math.trunc(
          quantity,
        ),
        1,
      ),
      99,
    );

  const currentItems =
    readCartItems();

  const existingIndex =
    currentItems.findIndex(
      (item) =>
        item.slug ===
          normalizedSlug &&
        item.variantId ===
          variantId,
    );

  if (
    existingIndex >= 0
  ) {
    const existingItem =
      currentItems[
        existingIndex
      ];

    currentItems[
      existingIndex
    ] = {
      ...existingItem,

      quantity:
        Math.min(
          existingItem.quantity +
            safeQuantity,
          99,
        ),
    };
  } else {
    currentItems.push({
      slug:
        normalizedSlug,

      variantId,

      quantity:
        safeQuantity,

      addedAt:
        new Date().toISOString(),
    });
  }

  writeCartItems(
    currentItems,
  );

  return currentItems;
}

export function updateCartItemQuantity({
  slug,
  variantId = null,
  quantity,
}: {
  slug: string;
  variantId?: string | null;
  quantity: number;
}): CartItem[] {
  const currentItems =
    readCartItems();

  const safeQuantity =
    Math.min(
      Math.max(
        Math.trunc(
          quantity,
        ),
        0,
      ),
      99,
    );

  const nextItems =
    safeQuantity === 0
      ? currentItems.filter(
          (item) =>
            !(
              item.slug ===
                slug &&
              item.variantId ===
                variantId
            ),
        )
      : currentItems.map(
          (item) =>
            item.slug ===
                slug &&
            item.variantId ===
                variantId
              ? {
                  ...item,

                  quantity:
                    safeQuantity,
                }
              : item,
        );

  writeCartItems(
    nextItems,
  );

  return nextItems;
}

export function removeCartItem({
  slug,
  variantId = null,
}: {
  slug: string;
  variantId?: string | null;
}): CartItem[] {
  const nextItems =
    readCartItems().filter(
      (item) =>
        !(
          item.slug ===
            slug &&
          item.variantId ===
            variantId
        ),
    );

  writeCartItems(
    nextItems,
  );

  return nextItems;
}

export function clearCart(): void {
  writeCartItems([]);
}

export function getCartQuantity(): number {
  return readCartItems().reduce(
    (
      total,
      item,
    ) =>
      total +
      item.quantity,
    0,
  );
}