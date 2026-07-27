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
        strokeWidth="1.45"
        strokeLinejoin="round"
      />

      <path
        d="M12 13V10.1C12 7.8 13.8 6 16 6C18.2 6 20 7.8 20 10.1V13"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />

      <path
        d="M16 15.5C17.5 18.1 19.1 19.3 21.4 20.1C19.1 20.9 17.5 22.1 16 24.7C14.5 22.1 12.9 20.9 10.6 20.1C12.9 19.3 14.5 18.1 16 15.5Z"
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />

      <circle
        cx="16"
        cy="20.1"
        r="1.15"
        fill="currentColor"
      />
    </svg>
  );
}

export function CartHeaderButton({
  locale,
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

  return (
    <Link
      href={`/${locale}/cart`}
      aria-label={label}
      title={label}
      className="group relative inline-flex h-11 shrink-0 items-center justify-center gap-2 overflow-visible rounded-2xl border border-[#e4c66f]/35 bg-[linear-gradient(145deg,rgba(217,184,95,0.1),rgba(7,70,50,0.4),rgba(2,35,25,0.9))] px-2.5 text-[#e9d493] shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_10px_25px_rgba(0,0,0,0.22)] transition duration-500 hover:-translate-y-0.5 hover:border-[#efd37d]/65 hover:text-[#ffe8aa] hover:shadow-[0_0_24px_rgba(224,193,111,0.14)] sm:px-3"
    >
      <span
        aria-hidden="true"
        className="absolute inset-[3px] rounded-[12px] border border-dashed border-[#efd184]/15 transition duration-500 group-hover:border-[#efd184]/30"
      />

      <span className="relative flex h-8 w-8 items-center justify-center">
        <span className="absolute inset-0 rounded-xl bg-[radial-gradient(circle,rgba(238,210,133,0.17),transparent_70%)] opacity-70 transition group-hover:opacity-100" />

        <EloriaBagIcon className="relative h-7 w-7 transition duration-500 group-hover:scale-110" />

        {quantity > 0 && (
          <span className="absolute -right-2 -top-2 z-20 flex min-h-5 min-w-5 items-center justify-center rounded-full border border-[#f1d483]/75 bg-[#0d4a36] px-1 text-[9px] font-semibold leading-none text-[#ffe6a2] shadow-[0_0_12px_rgba(239,207,121,0.38)]">
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