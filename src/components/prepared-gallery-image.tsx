"use client";

import { getImageProps } from "next/image";
import { useEffect, useState } from "react";
import { ProductImage } from "@/components/product-image";

type GalleryImage = { imageUrl: string; alt: string };

export function PreparedGalleryImage({
  images, index, sizes, className, locale
}: {
  images: GalleryImage[];
  index: number;
  sizes: string;
  className: string;
  locale: string;
}) {
  const target = images[index] ?? images[0];
  const [displayed, setDisplayed] = useState(target);
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!target) return;
    let cancelled = false;
    const requests: HTMLImageElement[] = [];

    const prepare = (item: GalleryImage, selected: boolean) => {
      const { props } = getImageProps({
        src: item.imageUrl, alt: item.alt, fill: true, sizes
      });
      const image = new window.Image();
      requests.push(image);
      image.decoding = "async";
      image.fetchPriority = selected ? "high" : "low";

      image.onload = async () => {
        try { await image.decode(); } catch {}
        if (selected && !cancelled) setDisplayed(item);
      };
      image.onerror = () => {
        if (selected && !cancelled) setDisplayed(item);
      };

      image.sizes = props.sizes ?? sizes;
      if (props.srcSet) image.srcset = props.srcSet;
      image.src = props.src;
    };

    prepare(target, true);
    const neighbors = new Set([
      (index + 1) % images.length,
      (index - 1 + images.length) % images.length
    ]);
    neighbors.delete(index);
    for (const neighbor of neighbors) {
      prepare(images[neighbor], false);
    }

    return () => {
      cancelled = true;
      for (const image of requests) {
        image.onload = null;
        image.onerror = null;
      }
    };
  }, [images, index, sizes, target]);

  if (!target || !displayed) return null;
  const waiting =
    displayed.imageUrl !== target.imageUrl ||
    loadedUrl !== displayed.imageUrl;

  return <>
    <ProductImage
      src={displayed.imageUrl}
      alt={displayed.alt}
      fill
      sizes={sizes}
      loading="eager"
      fetchPriority="high"
      className={className}
      onLoad={() => setLoadedUrl(displayed.imageUrl)}
    />
    {waiting && (
      <span
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-x-4 bottom-20 z-10 mx-auto w-fit rounded-full border border-[#e6c781]/30 bg-[#062c20] px-4 py-2 text-xs text-[#f8f0df]"
      >
        {locale === "fa"
          ? "?? ??? ????????? ??????"
          : "Preparing image?"}
      </span>
    )}
  </>;
}
