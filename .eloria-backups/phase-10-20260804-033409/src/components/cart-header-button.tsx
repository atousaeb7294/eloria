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
        d="M9.4 12.2H22.6L24.3 26H7.7L9.4 12.2Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />

      <path
        d="M12 13V10.1C12 7.8 13.8 6 16 6C18.2 6 20 7.8 20 10.1V13"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />

      <path
        d="M16 15.5C17.5 18.1 19.1 19.3 21.4 20.1C19.1 20.9 17.5 22.1 16 24.7C14.5 22.1 12.9 20.9 10.6 20.1C12.9 19.3 14.5 18.1 16 15.5Z"
        stroke="currentColor"
        strokeWidth="1.05"
        strokeLinejoin="round"
      />

      <circle
        cx="16"
        cy="20.1"
        r="1.05"
        fill="currentColor"
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
          "group relative grid size-10 shrink-0 place-items-center rounded-xl sm:size-11 sm:rounded-[13px]",
          "border border-[#dabe6e]/28",
          "bg-[linear-gradient(145deg,rgba(8,65,46,0.5),rgba(2,29,20,0.72))]",
          "text-[#e9d493]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_8px_24px_rgba(0,0,0,0.2)]",
          "transition duration-300",
          "hover:-translate-y-0.5",
          "hover:border-[#edd387]/64",
          "hover:bg-[linear-gradient(145deg,rgba(13,91,64,0.58),rgba(2,38,26,0.78))]",
          "hover:text-[#ffe8aa]",
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-[#e3c675]/55",
          className,
        ].join(" ")}
      >
        {/* گوشه‌های تزئینی */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1.5 top-1.5 size-1.5 border-l border-t border-[#e9cd80]/42"
        />

        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1.5 right-1.5 size-1.5 border-b border-r border-[#e9cd80]/42"
        />

        {/* نور داخلی */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[5px] rounded-[9px] bg-[radial-gradient(circle_at_50%_35%,rgba(235,205,126,0.12),transparent_68%)] opacity-70 transition duration-300 group-hover:opacity-100"
        />

        <EloriaBagIcon className="relative size-[25px] transition duration-300 group-hover:scale-[1.06]" />

        {quantity > 0 && (
          <span className="absolute -end-1 -top-1 z-20 flex min-h-[18px] min-w-[18px] items-center justify-center rounded-full border border-[#f1d483]/75 bg-[#0b4934] px-1 text-[8px] font-semibold leading-none text-[#ffe6a2] shadow-[0_0_10px_rgba(239,207,121,0.32)]">
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

      <span className="relative hidden whitespace-nowrap text-[11px] font-medium sm:inline">
        {cartText}
      </span>
    </Link>
  );
}