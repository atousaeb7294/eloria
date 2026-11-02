"use client";

import { useEffect, useRef, useState } from "react";

type ProductCardLivePriceProps = {
  slug: string;
  locale: string;
  initialPriceToman?: string | null;
  previewOnly?: boolean;
  compact?: boolean;
  enabled?: boolean;
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
  initialPriceToman = null,
  previewOnly = false,
  compact = false,
  enabled = true,
}: ProductCardLivePriceProps) {
  const [price, setPrice] = useState<string | null>(initialPriceToman);
  const [failed, setFailed] = useState(false);
  const isPersian = locale === "fa";
  const seat = useRef<HTMLParagraphElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const node = seat.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      const timer = window.setTimeout(() => setVisible(true), 0);
      return () => window.clearTimeout(timer);
    }
    const observer = new IntersectionObserver(entries => {
      setVisible(entries.some(entry => entry.isIntersecting));
    }, {rootMargin:"150px"});
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (previewOnly || !enabled || !visible) return;
    let controller: AbortController | null = null;
    let disposed = false;
    let busy = false;

    async function loadPrice() {
      if (disposed || busy || document.visibilityState === "hidden") return;
      busy = true;
      const request = new AbortController();
      controller = request;
      const timeout = window.setTimeout(() => request.abort(), 12000);
      try {
        const response = await fetch(
          `/api/products/${encodeURIComponent(slug)}/price?display=1`,
          {
            signal: request.signal,
            cache: "no-store",
          },
        );

        if (!response.ok) {
          throw new Error("Price request failed");
        }

        const payload = (await response.json()) as PriceResponse;
        const finalPrice = payload.pricing?.finalPriceToman;

        if (!payload.successful || !finalPrice || !/^\d+$/.test(finalPrice)) {
          throw new Error("Price unavailable");
        }

        if (!disposed) {
          setPrice(finalPrice);
          setFailed(false);
        }
      } catch {
        // Timeouts should leave a useful fallback, not an endless loading label.
        if (!disposed) setFailed(true);
      } finally {
        window.clearTimeout(timeout);
        busy = false;
      }
    }

    void loadPrice();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadPrice();
      }
    }, 60_000);
    const resume = () => void loadPrice();
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      controller?.abort();
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [previewOnly, slug, enabled, visible]);

  if (failed && !price) {
    return (
      <p ref={seat} className="text-sm text-[#d8c79e]/75">
        {isPersian ? "قیمت در صفحه محصول" : "Price on product page"}
      </p>
    );
  }

  if (!price) {
    return (
      <p ref={seat} className="flex items-center gap-2 text-xs text-[#d8c79e]/75" aria-live="polite">
        <span className="size-2 animate-pulse rounded-full bg-[#e2c671]" />
        {isPersian ? "در حال دریافت قیمت…" : "Loading price…"}
      </p>
    );
  }

  return (
    <p ref={seat} className="flex items-baseline gap-2 text-[#f3d98c]">
      <strong className={`${compact ? "text-xs" : "text-xl"} font-semibold tracking-tight`}>
        {formatPrice(price, locale)}
      </strong>
      <span className={`${compact ? "text-[9px]" : "text-xs"} text-[#d9c28b]/80`}>
        {isPersian ? "تومان" : "Toman"}
      </span>
    </p>
  );
}
