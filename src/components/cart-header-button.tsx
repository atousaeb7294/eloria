"use client";

import Link from "next/link";
import {
  useSyncExternalStore,
} from "react";

import {
  getCartQuantity,
  subscribeToCart,
} from "@/lib/cart-storage";

type CartHeaderButtonProps = {
  locale: string;
  variant?: "default" | "compact";
  className?: string;
};

function getServerCartQuantitySnapshot(): number {
  return 0;
}

function EloriaBagIcon({
  className,
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M7 14.5H25L23.5 25.5H8.5L7 14.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      <path
        d="M8 14.5L11 7.5H21L24 14.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      <path
        d="M11 18H21"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        opacity="0.65"
      />

      <path
        d="M16 16.5L18.2 19L16 21.5L13.8 19L16 16.5Z"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />
    </svg>
  );
}
export function CartHeaderButton({
  locale,
  variant = "default",
  className = "",
}: CartHeaderButtonProps) {
  const isPersian =
    locale === "fa";

  const quantity =
    useSyncExternalStore(
      subscribeToCart,
      getCartQuantity,
      getServerCartQuantitySnapshot,
    );

  const displayedQuantity =
    quantity > 99
      ? "99+"
      : quantity.toLocaleString(
          isPersian
            ? "fa-IR"
            : "en-US",
        );

  const cartText =
    isPersian
      ? "سبد خرید"
      : "Shopping Bag";

  const label =
    quantity > 0
      ? isPersian
        ? `${cartText}، ${displayedQuantity} محصول`
        : `${cartText}, ${displayedQuantity} items`
      : cartText;

  if (
    variant ===
    "compact"
  ) {
    return (
      <Link
        href={`/${locale}/cart`}
        aria-label={label}
        title={label}
        className={[
          "group relative inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-3",
          "border border-[#dabe6e]/28",
          "bg-[linear-gradient(145deg,rgba(8,65,46,0.5),rgba(2,29,20,0.72))]",
          "text-[#e9d493]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_8px_24px_rgba(0,0,0,0.2)]",
          "transition duration-300 hover:-translate-y-0.5",
          "hover:text-[#ffe8aa]",
          className,
        ].join(" ")}
      >
        <EloriaBagIcon className="relative size-6 transition duration-300 group-hover:scale-110" />

        <span className="relative whitespace-nowrap text-[11px] font-medium">
          {cartText}
        </span>

        {quantity > 0 && (
          <span className="absolute -end-1 -top-1 z-20 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[#f1d483]/75 bg-[#0b4934] px-1 text-[8px] font-semibold leading-none text-[#ffe6a2]">
            {displayedQuantity}
          </span>
        )}
      </Link>
    );
  }

  return (
    <Link
      href={`/${locale}/cart`}
      aria-label={label}
      title={label}
      className={[
        "group relative inline-flex h-11 shrink-0 items-center justify-center gap-2",
        "rounded-2xl border border-[#e4c66f]/35",
        "bg-[linear-gradient(145deg,rgba(217,184,95,0.1),rgba(7,70,50,0.4),rgba(2,35,25,0.9))]",
        "px-2.5 text-[#e9d493]",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_25px_rgba(0,0,0,0.22)]",
        "transition duration-500",
        "hover:-translate-y-0.5",
        "hover:border-[#efd37d]/65",
        "hover:text-[#ffe8aa]",
        "hover:shadow-[0_0_24px_rgba(224,193,111,0.14)]",
        "focus-visible:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-[#e3c675]/55",
        "sm:px-3",
        className,
      ].join(" ")}
    >
      <span
        aria-hidden="true"
        className="absolute inset-[3px] rounded-[12px] border border-dashed border-[#efd184]/15 transition duration-500 group-hover:border-[#efd184]/30"
      />

      <span className="relative flex size-8 items-center justify-center">
        <span className="absolute inset-0 rounded-xl bg-[radial-gradient(circle,rgba(238,210,133,0.17),transparent_70%)] opacity-70 transition group-hover:opacity-100" />

        <EloriaBagIcon className="relative size-7 transition duration-500 group-hover:scale-110" />

        {quantity > 0 && (
          <span className="absolute -end-1.5 -top-1.5 z-20 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[#f1d483]/75 bg-[#0d4a36] px-1 text-[8px] font-semibold leading-none text-[#ffe6a2] shadow-[0_0_10px_rgba(239,207,121,0.34)]">
            {displayedQuantity}
          </span>
        )}
      </span>

      <span className="relative whitespace-nowrap text-[11px] font-medium">
        {cartText}
      </span>
    </Link>
  );
}




























