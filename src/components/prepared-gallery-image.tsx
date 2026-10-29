"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product-image";

type GalleryImage = { imageUrl: string; alt: string };

export function PreparedGalleryImage({ images, index, sizes, className, locale }: {
  images: GalleryImage[]; index: number; sizes: string; className: string; locale: string;
}) {
  const target = images[index] ?? images[0];
  if (!target) return null;
  return <VisibleGalleryPhoto key={target.imageUrl} target={target} sizes={sizes} className={className} locale={locale} />;
}

function VisibleGalleryPhoto({ target, sizes, className, locale }: {
  target: GalleryImage; sizes: string; className: string; locale: string;
}) {
  const [settled, setSettled] = useState(false);
  // Render the selected image immediately. The browser owns loading/decoding;
  // no hidden second image, decode gate, or speculative neighbor download.
  return <>
    <ProductImage src={target.imageUrl} alt={target.alt} fill sizes={sizes}
      loading="eager" fetchPriority="high" className={className}
      onLoad={() => setSettled(true)} onError={() => setSettled(true)} />
    {!settled && <span role="status" aria-live="polite"
      className="pointer-events-none absolute inset-x-4 bottom-20 z-10 mx-auto w-fit rounded-full border border-[#e6c781]/30 bg-[#101744] px-4 py-2 text-xs text-[#f8f0df]">
      {locale === "fa" ? "در حال بارگذاری تصویر…" : "Loading image..."}
    </span>}
  </>;
}
