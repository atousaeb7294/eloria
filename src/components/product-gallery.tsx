"use client";

import Image from "next/image";

import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type ProductGalleryImage = {
  imageUrl: string;
  alt: string;
};

function isRemoteImageUrl(
  imageUrl: string,
) {
  return /^https?:\/\//.test(
    imageUrl,
  );
}

type ProductGalleryProps = {
  locale: string;
  images: ProductGalleryImage[];
  materialLabel: string;
  collectionLabel: string;
  isGold: boolean;
  unavailable?: boolean;
};

export function ProductGallery({
  locale,
  images,
  materialLabel,
  collectionLabel,
  isGold,
  unavailable = false,
}: ProductGalleryProps) {
  const isPersian = locale === "fa";
  const safeImages = useMemo(
    () => images.filter((image) => Boolean(image.imageUrl)),
    [images],
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeImage = safeImages[activeIndex] ?? safeImages[0];
  const hasMultipleImages = safeImages.length > 1;

  useEffect(() => {
    if (!isExpanded) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false);
      }

      if (!hasMultipleImages) {
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current + 1) % safeImages.length);
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex(
          (current) => (current - 1 + safeImages.length) % safeImages.length,
        );
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [hasMultipleImages, isExpanded, safeImages.length]);

  if (!activeImage) {
    return null;
  }

  const showPrevious = () => {
    setActiveIndex(
      (current) => (current - 1 + safeImages.length) % safeImages.length,
    );
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % safeImages.length);
  };

  return (
    <>
      <div className="grid gap-3 rounded-[2rem]">
        <div
          className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/[0.07] bg-[#031811] shadow-[0_22px_65px_rgba(0,0,0,0.38)]"
        >
          <Image
            key={activeImage.imageUrl}
            src={activeImage.imageUrl}
            alt={activeImage.alt}
            fill
            unoptimized={
              isRemoteImageUrl(
                activeImage.imageUrl,
              )
            }
            priority
            sizes="(max-width: 1024px) 100vw, 55vw"
            className="object-cover transition duration-1000 ease-out hover:scale-[1.025]"
          />

          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#01130d]/85 via-transparent to-black/10" />
          <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_95px_rgba(0,0,0,0.25)]" />

          <div className="absolute start-4 top-4 flex flex-wrap items-center gap-2 sm:start-5 sm:top-5">
            <span
              className={[
                "rounded-full border px-3 py-1.5 text-[11px] backdrop-blur-xl sm:px-4 sm:py-2",
                isGold
                  ? "border-[#e3c775]/40 bg-[#4c3a12]/55 text-[#f1d98f]"
                  : "border-[#d8e1e4]/35 bg-[#526268]/40 text-[#e2eaed]",
              ].join(" ")}
            >
              {materialLabel}
            </span>

            {unavailable && (
              <span className="rounded-full border border-rose-200/20 bg-[#47131b]/80 px-3 py-1.5 text-[11px] text-rose-100 backdrop-blur-xl sm:px-4 sm:py-2">
                {isPersian ? "ناموجود" : "Unavailable"}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            aria-label={isPersian ? "بزرگ‌نمایی تصویر" : "Enlarge image"}
            className="absolute end-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[#031811]/70 text-[#f4e4b7] backdrop-blur-xl transition hover:scale-105 hover:border-[#e6c875]/50 hover:bg-[#0a2a1e]/90 sm:end-5 sm:top-5"
          >
            <Maximize2 className="h-4.5 w-4.5" />
          </button>

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={showPrevious}
                aria-label={isPersian ? "تصویر قبلی" : "Previous image"}
                className="absolute start-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#031811]/65 text-white/75 backdrop-blur-xl transition hover:border-[#e5c773]/45 hover:text-[#f5dfa2]"
              >
                {isPersian ? (
                  <ChevronRight className="h-5 w-5" />
                ) : (
                  <ChevronLeft className="h-5 w-5" />
                )}
              </button>

              <button
                type="button"
                onClick={showNext}
                aria-label={isPersian ? "تصویر بعدی" : "Next image"}
                className="absolute end-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/12 bg-[#031811]/65 text-white/75 backdrop-blur-xl transition hover:border-[#e5c773]/45 hover:text-[#f5dfa2]"
              >
                {isPersian ? (
                  <ChevronLeft className="h-5 w-5" />
                ) : (
                  <ChevronRight className="h-5 w-5" />
                )}
              </button>
            </>
          )}

          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 sm:p-6">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] text-[#d2bd83]/70">
                Eloria Jewelry
              </p>
              <p className="mt-2 text-sm text-[#efe3c9]/80">{collectionLabel}</p>
            </div>

            {hasMultipleImages && (
              <span className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[11px] text-white/70 backdrop-blur-xl">
                {(activeIndex + 1).toLocaleString(isPersian ? "fa-IR" : "en-US")}
                <span className="px-1 text-white/35">/</span>
                {safeImages.length.toLocaleString(isPersian ? "fa-IR" : "en-US")}
              </span>
            )}
          </div>
        </div>

        {hasMultipleImages && (
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            aria-label={isPersian ? "تصاویر محصول" : "Product images"}
          >
            {safeImages.map((image, index) => (
              <button
                key={`${image.imageUrl}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                aria-label={
                  isPersian
                    ? `نمایش تصویر ${(index + 1).toLocaleString("fa-IR")}`
                    : `Show image ${index + 1}`
                }
                aria-current={index === activeIndex ? "true" : undefined}
                className={[
                  "relative h-20 w-16 shrink-0 overflow-hidden rounded-2xl border bg-[#031811] transition sm:h-24 sm:w-20",
                  index === activeIndex
                    ? "border-[#e2c46f]/75 shadow-[0_0_22px_rgba(218,184,95,0.14)]"
                    : "border-white/10 opacity-65 hover:border-white/25 hover:opacity-100",
                ].join(" ")}
              >
                <Image
                  src={image.imageUrl}
                  alt=""
                  fill
                  unoptimized={
                    isRemoteImageUrl(
                      image.imageUrl,
                    )
                  }
                  sizes="80px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {isExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isPersian ? "نمایش بزرگ تصویر محصول" : "Expanded product image"}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-[#010806]/95 p-3 backdrop-blur-xl sm:p-8"
          onClick={() => setIsExpanded(false)}
        >
          <button
            type="button"
            onClick={() => setIsExpanded(false)}
            aria-label={isPersian ? "بستن" : "Close"}
            className="absolute end-4 top-4 z-10 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-white/80 transition hover:bg-white/[0.12] hover:text-white sm:end-8 sm:top-8"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative h-[82vh] w-full max-w-6xl overflow-hidden rounded-[2rem] border border-white/10 bg-[#020d09]"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={activeImage.imageUrl}
              alt={activeImage.alt}
              fill
              unoptimized={
                isRemoteImageUrl(
                  activeImage.imageUrl,
                )
              }
              priority
              sizes="100vw"
              className="object-contain"
            />

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={showPrevious}
                  aria-label={isPersian ? "تصویر قبلی" : "Previous image"}
                  className="absolute start-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-xl transition hover:bg-black/60"
                >
                  {isPersian ? (
                    <ChevronRight className="h-6 w-6" />
                  ) : (
                    <ChevronLeft className="h-6 w-6" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={showNext}
                  aria-label={isPersian ? "تصویر بعدی" : "Next image"}
                  className="absolute end-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white backdrop-blur-xl transition hover:bg-black/60"
                >
                  {isPersian ? (
                    <ChevronLeft className="h-6 w-6" />
                  ) : (
                    <ChevronRight className="h-6 w-6" />
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
