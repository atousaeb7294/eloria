"use client";

import type {
  CSSProperties,
} from "react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Image from "next/image";
import Link from "next/link";

import {
  useIntroComplete,
} from "@/components/intro/use-intro-complete";

type FeaturedAlbumItem = {
  slug: string;
  name: string;
  imageUrl: string;
  href: string;
};

type FeaturedResponse = {
  items?: FeaturedAlbumItem[];
};

const AUTO_ADVANCE_MS = 4200;
const API_CLIENT_TIMEOUT_MS = 1800;

const FA_SELECTION =
  "\u0645\u0646\u062a\u062e\u0628 \u0627\u0644\u0648\u0631\u06cc\u0627";

const FA_PREVIOUS =
  "\u0627\u062b\u0631 \u0642\u0628\u0644\u06cc";

const FA_NEXT =
  "\u0627\u062b\u0631 \u0628\u0639\u062f\u06cc";

const FA_CAROUSEL_LABEL =
  "\u0645\u0646\u062a\u062e\u0628\u200c\u0647\u0627\u06cc \u0627\u0644\u0648\u0631\u06cc\u0627";

function getFallbackItems(
  locale: string,
): FeaturedAlbumItem[] {
  const name =
    locale === "fa"
      ? FA_SELECTION
      : "Eloria Selection";

  return [
    {
      slug: "fallback-bracelet",
      name,
      imageUrl: "/images/collections/bracelet.jpg",
      href: `/${locale}/products`,
    },
    {
      slug: "fallback-earring",
      name,
      imageUrl: "/images/collections/earring.jpg",
      href: `/${locale}/products`,
    },
    {
      slug: "fallback-necklace",
      name,
      imageUrl: "/images/collections/necklaces.jfif",
      href: `/${locale}/products`,
    },
  ];
}

function ArrowLeftIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14.75 5.5 8.25 12l6.5 6.5" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9.25 5.5 6.5 6.5-6.5 6.5" />
    </svg>
  );
}

function formatDigits(
  value: number,
  isPersian: boolean,
) {
  const raw =
    String(value).padStart(2, "0");

  if (!isPersian) {
    return raw;
  }

  return raw.replace(
    /\d/g,
    (digit) =>
      "\u06f0\u06f1\u06f2\u06f3\u06f4\u06f5\u06f6\u06f7\u06f8\u06f9"[
        Number(digit)
      ],
  );
}

export function HomeFeaturedAlbum({
  locale,
}: {
  locale: string;
}) {
  const isPersian =
    locale === "fa";

  const fallbackItems = useMemo(
    () => getFallbackItems(locale),
    [locale],
  );

  const [items, setItems] =
    useState<FeaturedAlbumItem[]>(
      fallbackItems,
    );

  const [activeIndex, setActiveIndex] =
    useState(0);

  const [paused, setPaused] =
    useState(false);

  const introComplete =
    useIntroComplete();

  const [
    prefersReducedMotion,
    setPrefersReducedMotion,
  ] = useState(false);

  const touchStartX =
    useRef<number | null>(null);

  useEffect(() => {
    const query =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      );

    const sync = () => {
      setPrefersReducedMotion(
        query.matches,
      );
    };

    sync();
    query.addEventListener(
      "change",
      sync,
    );

    return () => {
      query.removeEventListener(
        "change",
        sync,
      );
    };
  }, []);

  useEffect(() => {
    if (!introComplete) {
      return;
    }

    const controller =
      new AbortController();

    let cancelled = false;

    const timeout =
      window.setTimeout(
        () => {
          controller.abort();
        },
        API_CLIENT_TIMEOUT_MS,
      );

    async function loadProducts() {
      try {
        const response =
          await fetch(
            `/api/home-featured-products?locale=${encodeURIComponent(locale)}`,
            {
              cache: "no-store",
              signal:
                controller.signal,
            },
          );

        if (!response.ok) {
          return;
        }

        const payload =
          (await response.json()) as FeaturedResponse;

        if (
          cancelled ||
          !Array.isArray(payload.items) ||
          payload.items.length < 2
        ) {
          return;
        }

        setItems(payload.items);
        setActiveIndex(0);
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        // Keep the local fallback visible.
      } finally {
        window.clearTimeout(
          timeout,
        );
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(
        timeout,
      );
    };
  }, [
    introComplete,
    locale,
  ]);

  useEffect(() => {
    if (
      !introComplete ||
      paused ||
      prefersReducedMotion ||
      items.length < 2
    ) {
      return;
    }

    const timer =
      window.setInterval(() => {
        setActiveIndex(
          (current) =>
            (current + 1) %
            items.length,
        );
      }, AUTO_ADVANCE_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [
    introComplete,
    items.length,
    paused,
    prefersReducedMotion,
  ]);

  function previous() {
    setActiveIndex(
      (current) =>
        (current -
          1 +
          items.length) %
        items.length,
    );
  }

  function next() {
    setActiveIndex(
      (current) =>
        (current + 1) %
        items.length,
    );
  }

  function getSignedOffset(
    index: number,
  ) {
    const length =
      items.length;

    if (!length) {
      return 99;
    }

    let offset =
      (index -
        activeIndex +
        length) %
      length;

    if (
      offset >
      length / 2
    ) {
      offset -= length;
    }

    return offset;
  }

  function getMotionStyle(
    rawOffset: number,
  ): CSSProperties {
    const offset =
      isPersian
        ? -rawOffset
        : rawOffset;

    if (offset === 0) {
      return {
        transform:
          "translate3d(-50%, 0px, 0) scale(1) rotate(0deg)",
        opacity: 1,
        filter:
          "brightness(1) saturate(1)",
        zIndex: 30,
        pointerEvents: "auto",
      };
    }

    if (offset === -1) {
      return {
        transform:
          "translate3d(-118%, 48px, 0) scale(.89) rotate(-3.5deg)",
        opacity: 0.48,
        filter:
          "brightness(.69) saturate(.79)",
        zIndex: 16,
        pointerEvents: "none",
      };
    }

    if (offset === 1) {
      return {
        transform:
          "translate3d(18%, 48px, 0) scale(.89) rotate(3.5deg)",
        opacity: 0.48,
        filter:
          "brightness(.69) saturate(.79)",
        zIndex: 16,
        pointerEvents: "none",
      };
    }

    if (offset === -2) {
      return {
        transform:
          "translate3d(-151%, 76px, 0) scale(.80) rotate(-6deg)",
        opacity: 0,
        filter:
          "brightness(.56) saturate(.68) blur(1.2px)",
        zIndex: 4,
        pointerEvents: "none",
      };
    }

    return {
      transform:
        "translate3d(51%, 76px, 0) scale(.80) rotate(6deg)",
      opacity: 0,
      filter:
        "brightness(.56) saturate(.68) blur(1.2px)",
      zIndex: 4,
      pointerEvents: "none",
    };
  }

  function handleSwipe(
    distance: number,
  ) {
    if (
      Math.abs(distance) <
      45
    ) {
      return;
    }

    if (
      isPersian
        ? distance < 0
        : distance > 0
    ) {
      previous();
      return;
    }

    next();
  }

  const currentNumber =
    formatDigits(
      activeIndex + 1,
      isPersian,
    );

  const totalNumber =
    formatDigits(
      items.length,
      isPersian,
    );

  const progress =
    items.length
      ? ((activeIndex + 1) /
          items.length) *
        100
      : 0;

  return (
    <div
      dir={isPersian ? "rtl" : "ltr"}
      role="region"
      aria-roledescription="carousel"
      aria-label={
        isPersian
          ? FA_CAROUSEL_LABEL
          : "Eloria featured creations"
      }
      className="relative mx-auto w-full max-w-[1010px] select-none touch-pan-y"
      onMouseEnter={() =>
        setPaused(true)
      }
      onMouseLeave={() =>
        setPaused(false)
      }
      onFocusCapture={() =>
        setPaused(true)
      }
      onBlurCapture={() =>
        setPaused(false)
      }
      onTouchStart={(event) => {
        touchStartX.current =
          event.touches[0]
            ?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (
          touchStartX.current ===
          null
        ) {
          return;
        }

        const endX =
          event.changedTouches[0]
            ?.clientX;

        if (
          endX !== undefined
        ) {
          handleSwipe(
            endX -
              touchStartX.current,
          );
        }

        touchStartX.current =
          null;
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[45%] h-[320px] w-[62%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0e7553]/[0.11] blur-[92px]"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-[42%] h-[210px] w-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#d6b45d]/[0.07] blur-[72px]"
      />

      <div className="relative h-[405px] overflow-visible sm:h-[510px] lg:h-[575px]">
        {items.map(
          (
            item,
            index,
          ) => {
            const offset =
              getSignedOffset(
                index,
              );

            if (
              Math.abs(offset) >
              2
            ) {
              return null;
            }

            const isActive =
              offset === 0;

            return (
              <div
                key={item.slug}
                className="absolute left-1/2 top-3 w-[64%] origin-center transform-gpu will-change-[transform,opacity,filter] transition-[transform,opacity,filter] duration-[1450ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:duration-0 sm:w-[49%] lg:w-[39%]"
                style={
                  getMotionStyle(
                    offset,
                  )
                }
                aria-hidden={
                  !isActive
                }
              >
                <div
                  className={
                    isActive
                      ? "relative overflow-hidden rounded-[30px] border border-[#d9bb70]/26 bg-[#061710] shadow-[0_38px_120px_rgba(0,0,0,.48),0_0_48px_rgba(215,181,94,.08)]"
                      : "relative overflow-hidden rounded-[28px] border border-[#d9bb70]/10 bg-[#04120d] shadow-[0_22px_68px_rgba(0,0,0,.32)]"
                  }
                >
                  <div className="relative aspect-[4/5] overflow-hidden">
                    <Link
                      href={item.href}
                      tabIndex={
                        isActive
                          ? 0
                          : -1
                      }
                      className={
                        isActive
                          ? "group relative block h-full w-full"
                          : "pointer-events-none relative block h-full w-full"
                      }
                    >
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        fill
                        sizes="(max-width: 640px) 64vw, (max-width: 1024px) 49vw, 39vw"
                        draggable={false}
                        loading="lazy"
                        fetchPriority="auto"
                        className={
                          isActive
                            ? "object-cover transition-transform duration-[4000ms] ease-out group-hover:scale-[1.018] motion-reduce:transition-none"
                            : "object-cover"
                        }
                      />

                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,transparent_54%,rgba(1,9,6,.08)_68%,rgba(1,9,6,.91)_100%)]" />

                      <div className="pointer-events-none absolute inset-x-0 bottom-0 px-5 pb-5 pt-14 text-center sm:px-7 sm:pb-7">
                        <div className="mx-auto mb-3 h-px w-10 bg-[linear-gradient(90deg,transparent,#d7b55f,transparent)]" />

                        <p
                          className={
                            isPersian
                              ? "font-sans truncate text-[12px] font-medium leading-7 tracking-normal text-[#f0ddb0]/92 sm:text-[14px]"
                              : "truncate text-[11px] font-medium tracking-[0.02em] text-[#f0ddb0]/92 sm:text-[13px]"
                          }
                        >
                          {item.name}
                        </p>
                      </div>
                    </Link>
                  </div>
                </div>
              </div>
            );
          },
        )}
      </div>

      <div className="relative z-40 mx-auto mt-3 flex w-fit items-center gap-2 rounded-full border border-[#d9bb70]/15 bg-[linear-gradient(180deg,rgba(6,28,20,.76),rgba(3,17,12,.88))] p-1.5 shadow-[0_16px_48px_rgba(0,0,0,.26),inset_0_1px_0_rgba(255,255,255,.025)] backdrop-blur-xl sm:gap-3 sm:p-2">
        <button
          type="button"
          onClick={previous}
          aria-label={
            isPersian
              ? FA_PREVIOUS
              : "Previous creation"
          }
          className="group grid h-11 w-11 place-items-center rounded-full border border-[#d9bb70]/12 bg-[#0a2319]/52 text-[#dfc275]/76 transition duration-500 hover:border-[#e6c97c]/32 hover:bg-[#103326]/72 hover:text-[#f2dc96] focus-visible:outline-none"
        >
          <span className="transition-transform duration-500 group-hover:scale-110">
            {isPersian
              ? <ArrowRightIcon />
              : <ArrowLeftIcon />}
          </span>
        </button>

        <div
          className="relative flex h-11 min-w-[128px] items-center justify-center overflow-hidden rounded-full border border-[#d9bb70]/10 bg-[#04150f]/62 px-5"
          aria-label={`${currentNumber} / ${totalNumber}`}
        >
          <div className="relative z-10 flex items-baseline gap-2">
            <span
              className={
                isPersian
                  ? "font-sans min-w-[28px] text-center text-[15px] font-semibold tracking-normal text-[#efd78d]"
                  : "min-w-[28px] text-center text-[14px] font-semibold tracking-[0.08em] text-[#efd78d]"
              }
            >
              {currentNumber}
            </span>

            <span className="text-[10px] text-[#a99262]/42">
              /
            </span>

            <span
              className={
                isPersian
                  ? "font-sans min-w-[24px] text-center text-[11px] tracking-normal text-[#c8b482]/58"
                  : "min-w-[24px] text-center text-[10px] tracking-[0.08em] text-[#c8b482]/58"
              }
            >
              {totalNumber}
            </span>
          </div>

          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-4 bottom-[6px] h-px overflow-visible bg-[#d9bb70]/10"
          >
            <span
              className="absolute inset-y-0 start-0 bg-[linear-gradient(90deg,#a98136,#e7cc81)] transition-[width] duration-700 ease-out motion-reduce:duration-0"
              style={{
                width:
                  `${progress}%`,
              }}
            />

            <span
              className="absolute top-1/2 h-[5px] w-[5px] -translate-y-1/2 rotate-45 bg-[#e8cc80] shadow-[0_0_10px_rgba(232,204,128,.42)] transition-[inset-inline-start] duration-700 ease-out motion-reduce:duration-0"
              style={{
                insetInlineStart:
                  `calc(${progress}% - 2px)`,
              }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={next}
          aria-label={
            isPersian
              ? FA_NEXT
              : "Next creation"
          }
          className="group grid h-11 w-11 place-items-center rounded-full border border-[#d9bb70]/12 bg-[#0a2319]/52 text-[#dfc275]/76 transition duration-500 hover:border-[#e6c97c]/32 hover:bg-[#103326]/72 hover:text-[#f2dc96] focus-visible:outline-none"
        >
          <span className="transition-transform duration-500 group-hover:scale-110">
            {isPersian
              ? <ArrowLeftIcon />
              : <ArrowRightIcon />}
          </span>
        </button>
      </div>
    </div>
  );
}
