"use client";

import {
  Check,
  ShoppingBag,
} from "lucide-react";

import {
  useState,
} from "react";

type CartItem = {
  slug: string;
  variantId: string | null;
  quantity: number;
  addedAt: string;
};

type AddToCartButtonProps = {
  locale: string;
  slug: string;
  variantId?: string | null;
  disabled?: boolean;
};

const CART_STORAGE_KEY =
  "eloria-cart-v1";

function readStoredCart(): CartItem[] {
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

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(
      (
        item,
      ): item is CartItem => {
        if (
          typeof item !==
            "object" ||
          item === null
        ) {
          return false;
        }

        const candidate =
          item as Partial<CartItem>;

        return (
          typeof candidate.slug ===
            "string" &&
          (typeof candidate.variantId ===
            "string" ||
            candidate.variantId ===
              null) &&
          typeof candidate.quantity ===
            "number" &&
          Number.isInteger(
            candidate.quantity,
          ) &&
          candidate.quantity > 0 &&
          typeof candidate.addedAt ===
            "string"
        );
      },
    );
  } catch {
    return [];
  }
}

export function AddToCartButton({
  locale,
  slug,
  variantId = null,
  disabled = false,
}: AddToCartButtonProps) {
  const isPersian =
    locale === "fa";

  const [
    added,
    setAdded,
  ] = useState(false);

  const addToCart = () => {
    if (disabled) {
      return;
    }

    const currentCart =
      readStoredCart();

    const existingIndex =
      currentCart.findIndex(
        (item) =>
          item.slug === slug &&
          item.variantId ===
            variantId,
      );

    if (
      existingIndex >= 0
    ) {
      const currentItem =
        currentCart[
          existingIndex
        ];

      currentCart[
        existingIndex
      ] = {
        ...currentItem,

        quantity:
          Math.min(
            currentItem.quantity +
              1,
            99,
          ),
      };
    } else {
      currentCart.push({
        slug,
        variantId,
        quantity: 1,

        addedAt:
          new Date().toISOString(),
      });
    }

    window.localStorage.setItem(
      CART_STORAGE_KEY,
      JSON.stringify(
        currentCart,
      ),
    );

    setAdded(true);

    window.setTimeout(() => {
      setAdded(false);
    }, 2200);
  };

  return (
    <button
      type="button"
      onClick={addToCart}
      disabled={disabled}
      className={[
        "group relative flex min-h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full border px-7 text-sm font-medium transition duration-500",
        disabled
          ? "cursor-not-allowed border-white/10 bg-white/[0.025] text-white/30"
          : added
            ? "border-emerald-300/40 bg-emerald-300/[0.1] text-emerald-100"
            : "border-[#e0c16d]/55 bg-[linear-gradient(100deg,rgba(112,80,20,0.22),rgba(218,183,90,0.28),rgba(112,80,20,0.22))] text-[#f5e4b3] hover:-translate-y-0.5 hover:border-[#f0d681]/85 hover:text-[#fff0c4] hover:shadow-[0_0_30px_rgba(218,183,91,0.14)]",
      ].join(" ")}
    >
      {!disabled && (
        <span
          aria-hidden="true"
          className="absolute inset-0 translate-x-full bg-[linear-gradient(110deg,transparent_25%,rgba(255,245,210,0.13)_50%,transparent_75%)] transition-transform duration-1000 group-hover:-translate-x-full"
        />
      )}

      {added ? (
        <Check className="relative h-5 w-5" />
      ) : (
        <ShoppingBag className="relative h-5 w-5" />
      )}

      <span className="relative">
        {disabled
          ? isPersian
            ? "این محصول قابل سفارش نیست"
            : "This product is unavailable"
          : added
            ? isPersian
              ? "به سبد خرید اضافه شد"
              : "Added to cart"
            : isPersian
              ? "افزودن به سبد خرید"
              : "Add to cart"}
      </span>
    </button>
  );
}