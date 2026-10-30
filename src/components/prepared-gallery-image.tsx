"use client";

import { useState } from "react";
import { ProductImage } from "@/components/product-image";

type GalleryImage = { imageUrl: string; alt: string };
type AspectCallback = (source: string, ratio: number) => void;

export function PreparedGalleryImage({ images, index, sizes, className, locale, onAspectRatio }: {
  images: GalleryImage[]; index: number; sizes: string; className: string; locale: string;
  onAspectRatio?: AspectCallback;
}) {
  const target = images[index] ?? images[0];
  if (!target) return null;
  return <VisibleGalleryPhoto key={target.imageUrl} target={target} sizes={sizes} className={className} locale={locale} onAspectRatio={onAspectRatio} />;
}

function VisibleGalleryPhoto({ target, sizes, className, locale, onAspectRatio }: {
  target: GalleryImage; sizes: string; className: string; locale: string;
  onAspectRatio?: AspectCallback;
}) {
  const [settled, setSettled] = useState(false);
  // Render the selected image immediately. The browser owns loading/decoding;
  // no hidden second image, decode gate, or speculative neighbor download.
  return <>
    <ProductImage src={target.imageUrl} alt={target.alt} fill sizes={sizes}
      loading="eager" fetchPriority="high" className={className}
      onLoad={event => {
        setSettled(true);
        const photo = event.currentTarget;
        if (photo.naturalWidth > 0 && photo.naturalHeight > 0)
          onAspectRatio?.(target.imageUrl, photo.naturalWidth / photo.naturalHeight);
      }} onError={() => setSettled(true)} />
    {!settled && <span role="status" aria-live="polite"
      className="pointer-events-none absolute inset-x-4 bottom-20 z-10 mx-auto w-fit rounded-full border border-[#e6c781]/30 bg-[#101744] px-4 py-2 text-xs text-[#f8f0df]">
      {locale === "fa" ? "در حال بارگذاری تصویر…" : "Loading image..."}
    </span>}
  </>;
}
