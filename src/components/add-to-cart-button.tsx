"use client";

import Link from "next/link";

import {
  Check,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  CART_STORAGE_KEY,
  CART_UPDATED_EVENT,
  addCartItem,
  readCartItems,
  updateCartItemQuantity,
} from "@/lib/cart-storage";

type AddToCartButtonProps = {
  locale: string;
  slug: string;
  variantId?: string | null;
  maxQuantity: number;
  disabled?: boolean;
};

export function AddToCartButton({
  locale,
  slug,
  variantId = null,
  maxQuantity,
  disabled = false,
}: AddToCartButtonProps) {
  const isPersian =
    locale === "fa";

  const safeMaximum =
    Math.max(
      Math.trunc(maxQuantity),
      0,
    );

  const [
    quantity,
    setQuantity,
  ] = useState(0);

  const [
    recentlyAdded,
    setRecentlyAdded,
  ] = useState(false);

  const syncQuantity =
    useCallback(() => {
      const item =
        readCartItems().find(
          (cartItem) =>
            cartItem.slug === slug &&
            cartItem.variantId ===
              variantId,
        );

      setQuantity(
        item?.quantity ?? 0,
      );
    }, [
      slug,
      variantId,
    ]);

  useEffect(() => {
    syncQuantity();

    const handleCartUpdate =
      () => {
        syncQuantity();
      };

    const handleStorage = (
      event: StorageEvent,
    ) => {
      if (
        event.key ===
          CART_STORAGE_KEY ||
        event.key === null
      ) {
        syncQuantity();
      }
    };

    window.addEventListener(
      CART_UPDATED_EVENT,
      handleCartUpdate,
    );

    window.addEventListener(
      "storage",
      handleStorage,
    );

    return () => {
      window.removeEventListener(
        CART_UPDATED_EVENT,
        handleCartUpdate,
      );

      window.removeEventListener(
        "storage",
        handleStorage,
      );
    };
  }, [syncQuantity]);

  const isUnavailable =
    disabled ||
    safeMaximum <= 0;

  const addFirstItem = () => {
    if (isUnavailable) {
      return;
    }

    addCartItem({
      slug,
      variantId,
      quantity: 1,
    });

    setRecentlyAdded(true);

    window.setTimeout(() => {
      setRecentlyAdded(false);
    }, 1800);
  };

  const increaseQuantity = () => {
    if (
      isUnavailable ||
      quantity >= safeMaximum ||
      quantity >= 99
    ) {
      return;
    }

    if (quantity === 0) {
      addFirstItem();
      return;
    }

    updateCartItemQuantity({
      slug,
      variantId,
      quantity:
        quantity + 1,
    });
  };

  const decreaseQuantity = () => {
    if (quantity <= 0) {
      return;
    }

    updateCartItemQuantity({
      slug,
      variantId,
      quantity:
        quantity - 1,
    });
  };

  const formattedQuantity =
    quantity.toLocaleString(
      isPersian
        ? "fa-IR"
        : "en-US",
    );

  const unavailableText =
    safeMaximum <= 0
      ? isPersian
        ? "ناموجود"
        : "Out of stock"
      : isPersian
        ? "این محصول قابل سفارش نیست"
        : "This product is unavailable";

  if (
    isUnavailable &&
    quantity === 0
  ) {
    return (
      <button
        type="button"
        disabled
        className="flex min-h-14 w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.025] px-7 text-sm text-white/30"
      >
        <ShoppingBag className="h-5 w-5" />

        <span>
          {unavailableText}
        </span>
      </button>
    );
  }

  if (quantity === 0) {
    return (
      <button
        type="button"
        onClick={addFirstItem}
        className="group relative flex min-h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-[#e4c66f]/55 bg-[linear-gradient(105deg,rgba(83,59,17,0.34),rgba(213,177,82,0.3),rgba(13,82,58,0.35))] px-7 text-sm font-medium text-[#f7e6b5] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] transition duration-500 hover:-translate-y-0.5 hover:border-[#f0d681]/85 hover:shadow-[0_0_34px_rgba(218,183,91,0.16)]"
      >
        <span className="absolute inset-0 translate-x-full bg-[linear-gradient(110deg,transparent_25%,rgba(255,245,210,0.14)_50%,transparent_75%)] transition-transform duration-1000 group-hover:-translate-x-full" />

        <span className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#f0d487]/30 bg-[#d9b85f]/[0.08]">
          <span className="absolute inset-[3px] rounded-lg border border-dashed border-[#efd184]/25" />

          {recentlyAdded ? (
            <Check className="relative h-4.5 w-4.5" />
          ) : (
            <ShoppingBag className="relative h-4.5 w-4.5" />
          )}
        </span>

        <span className="relative">
          {recentlyAdded
            ? isPersian
              ? "به سبد خرید اضافه شد"
              : "Added to shopping bag"
            : isPersian
              ? "افزودن به سبد خرید"
              : "Add to shopping bag"}
        </span>
      </button>
    );
  }

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-[#dfc16e]/35 bg-[linear-gradient(145deg,rgba(7,39,29,0.92),rgba(2,25,18,0.96))] p-3 shadow-[0_20px_55px_rgba(0,0,0,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex shrink-0 items-center rounded-full border border-[#dfc16e]/25 bg-black/15 p-1">
          <button
            type="button"
            onClick={decreaseQuantity}
            aria-label={
              isPersian
                ? "کاهش تعداد"
                : "Decrease quantity"
            }
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#dbc98f]/70 transition hover:bg-white/[0.06] hover:text-[#ffe8a9]"
          >
            <Minus className="h-4 w-4" />
          </button>

          <span className="min-w-12 text-center text-sm font-medium text-[#f7e4af]">
            {formattedQuantity}
          </span>

          <button
            type="button"
            onClick={increaseQuantity}
            disabled={
              quantity >=
                safeMaximum ||
              quantity >= 99
            }
            aria-label={
              isPersian
                ? "افزایش تعداد"
                : "Increase quantity"
            }
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#dbc98f]/70 transition hover:bg-white/[0.06] hover:text-[#ffe8a9] disabled:cursor-not-allowed disabled:opacity-25"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-xs text-[#f2dfaa]">
            {isPersian
              ? "در سبد خرید"
              : "In your shopping bag"}
          </p>

          <p className="mt-1 text-[10px] text-[#c9bb98]/50">
            {isPersian
              ? `حداکثر موجودی: ${safeMaximum.toLocaleString(
                  "fa-IR",
                )}`
              : `Available: ${safeMaximum.toLocaleString(
                  "en-US",
                )}`}
          </p>
        </div>

        <Link
          href={`/${locale}/cart`}
          className="group flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e1c16f]/40 bg-[#d9b85f]/[0.08] px-4 text-xs text-[#f1d98e] transition hover:border-[#efd47d]/70 hover:bg-[#d9b85f]/[0.13]"
        >
          <ShoppingBag className="h-4 w-4 transition group-hover:scale-110" />

          <span className="hidden sm:inline">
            {isPersian
              ? "مشاهده سبد"
              : "View bag"}
          </span>
        </Link>
      </div>
    </div>
  );
}