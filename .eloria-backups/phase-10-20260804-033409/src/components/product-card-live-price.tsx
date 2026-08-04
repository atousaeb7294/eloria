"use client";

import { useEffect, useState } from "react";

type ProductCardLivePriceProps = {
  slug: string;
  locale: string;
};

type PriceResponse = {
  successful?: boolean;
  pricing?: {
    finalPriceToman?: string;
  };
};

function formatPrice(value: string, locale: string) {
  try {
    return BigInt(value).toLocaleString(locale === "fa" ? "fa-IR" : "en-US");
  } catch {
    return value;
  }
}

export function ProductCardLivePrice({
  slug,
  locale,
}: ProductCardLivePriceProps) {
  const [price, setPrice] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const isPersian = locale === "fa";

  useEffect(() => {
    const controller = new AbortController();

    async function loadPrice() {
      try {
        const response = await fetch(
          `/api/products/${encodeURIComponent(slug)}/price?display=1`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Price request failed");
        }

        const payload = (await response.json()) as PriceResponse;
        const finalPrice = payload.pricing?.finalPriceToman;

        if (!payload.successful || !finalPrice) {
          throw new Error("Price unavailable");
        }

        setPrice(finalPrice);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setFailed(true);
      }
    }

    void loadPrice();

    return () => controller.abort();
  }, [slug]);

  if (failed) {
    return (
      <p className="text-sm text-[#d8c79e]/75">
        {isPersian ? "قیمت در صفحه محصول" : "Price on product page"}
      </p>
    );
  }

  if (!price) {
    return (
      <div
        className="h-7 w-36 animate-pulse rounded-full bg-white/[0.07]"
        aria-label={isPersian ? "در حال دریافت قیمت" : "Loading price"}
      />
    );
  }

  return (
    <p className="flex items-baseline gap-2 text-[#f3d98c]">
      <strong className="text-xl font-semibold tracking-tight">
        {formatPrice(price, locale)}
      </strong>
      <span className="text-xs text-[#d9c28b]/80">
        {isPersian ? "تومان" : "Toman"}
      </span>
    </p>
  );
}
