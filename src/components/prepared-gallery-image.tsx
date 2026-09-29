"use client";

import { getImageProps } from "next/image";
import { useEffect, useRef, useState } from "react";
import { ProductImage } from "@/components/product-image";

type GalleryImage = { imageUrl: string; alt: string };
type PreparedEntry = {
  image: HTMLImageElement;
  ready: Promise<void>;
};

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
  const prepared = useRef(new Map<string, PreparedEntry>());

  const neighborIndexes = images.length > 1
    ? Array.from(new Set([
        (index + 1) % images.length,
        (index - 1 + images.length) % images.length
      ])).filter(value => value !== index)
    : [];

  useEffect(() => {
    if (!target) return;
    let cancelled = false;

    const prepare = (item: GalleryImage, selected: boolean) => {
      const key = JSON.stringify([item.imageUrl, sizes]);
      const existing = prepared.current.get(key);
      if (existing) {
        if (selected) existing.image.fetchPriority = "high";
        return existing.ready;
      }

      const { props } = getImageProps({
        src: item.imageUrl,
        alt: item.alt,
        fill: true,
        sizes
      });

      const image = new window.Image();
      image.decoding = "async";
      image.fetchPriority = selected ? "high" : "low";

      const ready = new Promise<void>((resolve) => {
        let finishing = false;
        const finish = async () => {
          if (finishing) return;
          finishing = true;
          if (image.naturalWidth > 0) {
            try { await image.decode(); } catch {}
          }
          image.onload = null;
          image.onerror = null;
          resolve();
        };

        image.onload = () => { void finish(); };
        image.onerror = () => { void finish(); };
        image.sizes = props.sizes ?? sizes;
        if (props.srcSet) image.srcset = props.srcSet;
        image.src = props.src;

        if (image.complete) void finish();
      });

      prepared.current.set(key, { image, ready });
      return ready;
    };

    void prepare(target, true).then(() => {
      if (!cancelled) setDisplayed(target);
    });

    if (images.length > 1) {
      const neighbors = new Set([
        (index + 1) % images.length,
        (index - 1 + images.length) % images.length
      ]);
      neighbors.delete(index);
      for (const neighbor of neighbors) {
        void prepare(images[neighbor], false);
      }
    }

    return () => { cancelled = true; };
  }, [images, index, sizes, target]);

  if (!target || !displayed) return null;

  const waiting =
    displayed.imageUrl !== target.imageUrl ||
    loadedUrl !== displayed.imageUrl;

  return <>
    {neighborIndexes.map(neighbor => {
      const item = images[neighbor];
      const { props } = getImageProps({
        src: item.imageUrl,
        alt: item.alt,
        fill: true,
        sizes
      });
      return (
        <link
          key={`${item.imageUrl}:${sizes}`}
          rel="preload"
          as="image"
          href={props.srcSet ? undefined : props.src}
          imageSrcSet={props.srcSet}
          imageSizes={props.sizes}
          fetchPriority="low"
        />
      );
    })}

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
          ? "\u062f\u0631 \u062d\u0627\u0644 \u0628\u0627\u0631\u06af\u0630\u0627\u0631\u06cc \u062a\u0635\u0648\u06cc\u0631\u2026"
          : "Loading image..."}
      </span>
    )}
  </>;
}