"use client";

import { useId, useState } from "react";
import { LivePurchaseBox } from "@/components/live-purchase-box";
import type { HomePiece } from "@/lib/home-design-data";

/** Use the product page's strict quote and existing shopping bag in quick view. */
export function QuickPurchase({ piece, locale }: { piece: HomePiece; locale: string }) {
  const variants = piece.variants ?? [];
  const [variantId, setVariantId] = useState<string | null>(() =>
    (variants.find(variant => variant.stock > 0) ?? variants[0])?.id ?? null,
  );
  const selectId = useId();
  const fa = locale === "fa";

  return <div className="home-quick-purchase">
    {variants.length > 0 && <div className="home-quick-variant">
      <label htmlFor={selectId}>{fa ? "انتخاب مدل" : "Choose an option"}</label>
      <select id={selectId} value={variantId ?? ""} onChange={event => setVariantId(event.target.value)}>
        {variants.map(variant => <option key={variant.id} value={variant.id}>
          {fa ? variant.titleFa : variant.titleEn || variant.titleFa}
          {variant.stock <= 0 ? (fa ? " — پیش‌سفارش" : " — Preorder") : ""}
        </option>)}
      </select>
    </div>}
    <LivePurchaseBox key={`${piece.slug}:${variantId ?? "base"}`}
      locale={locale} slug={piece.slug} variantId={variantId} compact quick />
  </div>;
}
