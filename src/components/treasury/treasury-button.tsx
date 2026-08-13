"use client";

import {
  Heart,
} from "lucide-react";

import {
  usePathname,
} from "next/navigation";

import {
  useMemo,
  useSyncExternalStore,
} from "react";

import {
  isInTreasury,
  subscribeToTreasury,
  toggleTreasury,
  TREASURY_STORAGE_KEY,
} from "@/lib/treasury-storage";

type TreasuryButtonProps = {
  locale: string;
};

function getTreasurySnapshot() {
  if (
    typeof window === "undefined"
  ) {
    return "[]";
  }

  return (
    window.localStorage.getItem(
      TREASURY_STORAGE_KEY,
    ) ?? "[]"
  );
}

function getTreasuryServerSnapshot() {
  return "[]";
}

export function TreasuryButton({
  locale,
}: TreasuryButtonProps) {
  const isPersian =
    locale === "fa";

  const pathname =
    usePathname();

  const slug =
    useMemo(() => {
      const parts =
        pathname
          .split("/")
          .filter(Boolean);

      const productIndex =
        parts.indexOf("products");

      if (
        productIndex < 0 ||
        productIndex + 1 >=
          parts.length
      ) {
        return "";
      }

      try {
        return decodeURIComponent(
          parts[
            productIndex + 1
          ],
        );
      } catch {
        return parts[
          productIndex + 1
        ];
      }
    }, [pathname]);

  const snapshot =
    useSyncExternalStore(
      subscribeToTreasury,
      getTreasurySnapshot,
      getTreasuryServerSnapshot,
    );

  const saved =
    useMemo(() => {
      void snapshot;

      return slug
        ? isInTreasury(slug)
        : false;
    }, [
      slug,
      snapshot,
    ]);

  if (!slug) {
    return null;
  }

  const label =
    isPersian
      ? saved
        ? "\u062f\u0631 \u0645\u0646\u062a\u062e\u0628\u200c\u0647\u0627\u06cc \u0634\u0645\u0627"
        : "\u0627\u0641\u0632\u0648\u062f\u0646 \u0628\u0647 \u0645\u0646\u062a\u062e\u0628\u200c\u0647\u0627\u06cc \u0645\u0646"
      : saved
        ? "In your favorites"
        : "Add to favorites";

  return (
    <button
      type="button"
      aria-pressed={saved}
      onClick={() => {
        toggleTreasury(
          slug,
        );
      }}
      className={[
        "group flex min-h-12 w-full items-center justify-center gap-2.5 rounded-2xl border px-5 py-3 transition duration-300 motion-reduce:transition-none",
        saved
          ? "border-[#d9b85f]/30 bg-[#d9b85f]/[0.07] text-[#efd48a] shadow-[inset_0_1px_0_rgba(255,255,255,.025)]"
          : "border-white/[0.08] bg-white/[0.025] text-[#d9ccb0]/72 hover:border-[#d9b85f]/22 hover:bg-[#d9b85f]/[0.035] hover:text-[#ecd187]",
      ].join(" ")}
    >
      <Heart
        aria-hidden="true"
        className={[
          "h-[18px] w-[18px] transition duration-300 motion-reduce:transition-none",
          saved
            ? "scale-105 fill-[#d9b85f] text-[#d9b85f]"
            : "text-[#d7bd77]/68 group-hover:scale-105 group-hover:text-[#e1c36e]",
        ].join(" ")}
        strokeWidth={1.55}
      />

      <span
        className={
          isPersian
            ? "font-sans text-[12px] font-medium tracking-normal"
            : "text-xs font-medium"
        }
      >
        {label}
      </span>
    </button>
  );
}
