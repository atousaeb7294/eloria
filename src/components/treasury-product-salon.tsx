"use client";

import { ProductImage as Image } from "@/components/product-image";
import useEmblaCarousel from "embla-carousel-react";
import {
  ViewTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { TreasuryLink } from "@/components/treasury-transition";
import { ProductCardLivePrice } from "@/components/product-card-live-price";
import { LivePurchaseBox } from "@/components/live-purchase-box";
import { createStoryGesture } from "@/lib/treasury-story";
import type { CatalogProduct } from "@/lib/catalog";

export function TreasuryProductSalon({
  products: initialProducts,
  locale,
  pagination,
}: {
  products: CatalogProduct[];
  locale: string;
  pagination?: { page: number; pageCount: number; query: string };
}) {
  const fa = locale === "fa";
  const [products, setProducts] = useState(initialProducts);
  const [loadedPage, setLoadedPage] = useState(pagination?.page ?? 1);
  const [pageCount, setPageCount] = useState(pagination?.pageCount ?? 1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const pendingLoad = useRef<AbortController | null>(null);
  const loadNext = useCallback(async () => {
    if (!pagination || loadedPage >= pageCount || pendingLoad.current) return;
    const controller = new AbortController();
    pendingLoad.current = controller;
    const timer = window.setTimeout(() => controller.abort(), 10000);
    setLoadingMore(true);
    setLoadError(false);
    try {
      const query = new URLSearchParams(pagination.query);
      query.set("page", String(loadedPage + 1));
      const response = await fetch(`/api/treasury/catalog?${query}`, {
        signal: controller.signal,
      });
      const result = (await response.json()) as {
        successful: boolean;
        products: CatalogProduct[];
        page: number;
        pageCount: number;
      };
      if (!response.ok || !result.successful)
        throw new Error("catalog unavailable");
      setProducts((current) =>
        Array.from(
          new Map(
            [...current, ...result.products].map((item) => [item.id, item]),
          ).values(),
        ),
      );
      setLoadedPage(result.page);
      setPageCount(result.pageCount);
    } catch {
      if (!controller.signal.aborted) setLoadError(true);
    } finally {
      clearTimeout(timer);
      pendingLoad.current = null;
      setLoadingMore(false);
    }
  }, [pagination, loadedPage, pageCount]);
  useEffect(
    () => () => {
      pendingLoad.current?.abort();
    },
    [],
  );
  const [viewport, carousel] = useEmblaCarousel({
    align: "center",
    containScroll: false,
    loop: false,
    direction: fa ? "rtl" : "ltr",
    duration: 28,
  });
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [quickProduct, setQuickProduct] = useState<CatalogProduct | null>(null);
  const section = useRef<HTMLElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const name = (item: CatalogProduct) => (fa ? item.nameFa : item.nameEn);
  const picture = (item: CatalogProduct) =>
    item.image?.imageUrl ?? "/images/brand/eloria-logo.webp";

  useEffect(() => {
    if (!carousel) return;
    const sync = () => {
      const next = carousel.selectedScrollSnap();
      setSelected(next);
      if (next >= products.length - 3 && !loadError) void loadNext();
    };
    carousel.on("select", sync).on("reInit", sync);
    return () => {
      carousel.off("select", sync).off("reInit", sync);
    };
  }, [carousel, products.length, loadNext, loadError]);

  useEffect(() => {
    const element = section.current;
    if (!element || !carousel || products.length < 2) return;
    const gesture = createStoryGesture();
    let lastWheel = -Infinity;
    let lastDirection = 0;
    let releaseToPage = false;
    const wheel = (event: WheelEvent) => {
      if (
        event.ctrlKey ||
        event.metaKey ||
        dialog.current?.open ||
        (event.target instanceof Element &&
          event.target.closest("[data-native-scroll]"))
      )
        return;
      const delta =
        Math.abs(event.deltaY) >= Math.abs(event.deltaX)
          ? event.deltaY
          : event.deltaX * (fa ? -1 : 1);
      const now = performance.now();
      if (now - lastWheel > 180 || Math.sign(delta) !== lastDirection)
        releaseToPage = false;
      lastWheel = now;
      lastDirection = Math.sign(delta);
      if (releaseToPage) return;
      const step = gesture(delta * (event.deltaMode === 1 ? 16 : 1), now);
      if (
        (delta > 0 && !carousel.canScrollNext()) ||
        (delta < 0 && !carousel.canScrollPrev())
      ) {
        // Finish the current gesture on the last card; a new gesture exits.
        if (step) releaseToPage = true;
        else event.preventDefault();
        return;
      }
      event.preventDefault();
      if (step > 0) carousel.scrollNext();
      if (step < 0) carousel.scrollPrev();
    };
    // Scoped to the product stage. Filters and the rest of the page keep native scrolling.
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [carousel, fa, products.length]);

  useEffect(() => {
    if (!quickProduct || !dialog.current) return;
    const element = dialog.current;
    element.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      element.close();
      document.body.style.overflow = previous;
    };
  }, [quickProduct]);

  if (!products.length) return null;
  const select = (index: number) =>
    carousel?.scrollTo(
      index,
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
  return (
    <section
      ref={section}
      className="eloria-product-salon"
      aria-roledescription={fa ? "نمایشگاه آثار" : "carousel"}
      aria-label={fa ? "آثار گنجینه" : "Treasury creations"}
    >
      <p className="eloria-salon-instruction">
        {fa
          ? "ورق بزنید، اثر خود را پیدا کنید"
          : "Scroll through, find your creation"}
      </p>
      <div
        ref={viewport}
        className="eloria-salon-viewport"
        tabIndex={0}
        aria-label={
          fa
            ? "با کلیدهای جهت‌نما آثار را ببینید"
            : "Browse creations with arrow keys"
        }
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            const forward = fa
              ? event.key === "ArrowLeft"
              : event.key === "ArrowRight";
            select(
              Math.max(
                0,
                Math.min(products.length - 1, selected + (forward ? 1 : -1)),
              ),
            );
          }
        }}
      >
        <div className="eloria-salon-rail">
          {products.map((item, index) => (
            <article
              key={item.id}
              className="eloria-salon-piece"
              data-selected={index === selected}
              data-emphasized={index === (hovered ?? selected)}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setHovered(index);
              }}
              onPointerLeave={() => setHovered(null)}
              onClick={(event) => {
                if (
                  !(event.target instanceof Element) ||
                  !event.target.closest("a, button")
                )
                  select(index);
              }}
              data-side={index < selected ? "before" : "after"}
              aria-label={name(item)}
            >
              <div className="eloria-salon-piece-inner">
                <TreasuryLink
                  direction="up"
                  href={`/${locale}/products/${encodeURIComponent(item.slug)}`}
                  className="eloria-salon-image"
                  onClick={(event) => {
                    if (index !== selected) {
                      event.preventDefault();
                      select(index);
                    }
                  }}
                  tabIndex={index === selected ? 0 : -1}
                >
                  <ViewTransition
                    name={`eloria-product-${item.slug}`}
                    share="eloria-product-morph"
                    default="none"
                  >
                    <Image
                      src={picture(item)}
                      alt={name(item)}
                      fill
                      sizes="(max-width:640px) 70vw, 31vw"
                      loading={index < 3 ? "eager" : "lazy"}
                      className="object-cover"
                    />
                  </ViewTransition>
                </TreasuryLink>
                <h2 className={fa ? "font-persian-calligraphy" : "font-serif"}>
                  <TreasuryLink
                    direction="up"
                    href={`/${locale}/products/${encodeURIComponent(item.slug)}`}
                    tabIndex={index === selected ? 0 : -1}
                  >
                    {name(item)}
                  </TreasuryLink>
                </h2>
                {index === selected ? (
                  <ProductCardLivePrice
                    slug={item.slug}
                    locale={locale}
                    initialPriceToman={item.displayPriceToman}
                  />
                ) : (
                  <p className="text-xs text-[#ddcba4]">
                    {item.displayPriceToman
                      ? `${BigInt(item.displayPriceToman).toLocaleString(fa ? "fa-IR" : "en-US")} ${fa ? "تومان" : "toman"}`
                      : "—"}
                  </p>
                )}
                <button
                  type="button"
                  className="eloria-quick-button"
                  tabIndex={index === selected ? 0 : -1}
                  onClick={(event) => {
                    trigger.current = event.currentTarget;
                    setQuickProduct(item);
                  }}
                >
                  {fa
                    ? item.isAvailable
                      ? "خرید سریع"
                      : "مشاهده وضعیت"
                    : "Quick shop"}
                </button>
                <TreasuryLink
                  direction="up"
                  className="eloria-piece-details"
                  href={`/${locale}/products/${encodeURIComponent(item.slug)}`}
                  tabIndex={index === selected ? 0 : -1}
                >
                  {fa ? "دیدن صفحهٔ اثر" : "View creation"}
                  <span aria-hidden="true"> ↗</span>
                </TreasuryLink>
              </div>
            </article>
          ))}
        </div>
      </div>
      <div className="eloria-salon-controls">
        <button
          type="button"
          disabled={selected === 0}
          onClick={() => select(selected - 1)}
          aria-label={fa ? "اثر قبلی" : "Previous creation"}
        >
          {fa ? "→" : "←"}
        </button>
        <span aria-live="polite" aria-atomic="true">
          {(selected + 1).toLocaleString(fa ? "fa-IR" : "en-US")} /{" "}
          {products.length.toLocaleString(fa ? "fa-IR" : "en-US")}
        </span>
        <button
          type="button"
          disabled={selected === products.length - 1}
          onClick={() => select(selected + 1)}
          aria-label={fa ? "اثر بعدی" : "Next creation"}
        >
          {fa ? "←" : "→"}
        </button>
      </div>
      <nav
        className="eloria-salon-thumbnails"
        aria-label={fa ? "انتخاب اثر" : "Choose a creation"}
        data-native-scroll
      >
        {products.map((item, index) => (
          <button
            key={item.id}
            type="button"
            aria-label={name(item)}
            aria-pressed={index === selected}
            onClick={() => select(index)}
          >
            <Image
              src={picture(item)}
              alt=""
              fill
              sizes="52px"
              className="object-cover"
            />
          </button>
        ))}
      </nav>
      {loadedPage < pageCount && (
        <div className="text-center text-xs text-[#ddcba4]">
          <button
            type="button"
            className="min-h-11 px-5"
            disabled={loadingMore}
            onClick={() => void loadNext()}
          >
            {loadingMore
              ? fa
                ? "دریافت آثار…"
                : "Loading…"
              : loadError
                ? fa
                  ? "دریافت دوبارهٔ ادامهٔ آثار"
                  : "Retry loading"
                : fa
                  ? "ادامهٔ آثار"
                  : "More creations"}
          </button>
        </div>
      )}
      <dialog
        ref={dialog}
        className="eloria-quick-dialog"
        aria-label={
          quickProduct
            ? fa
              ? `خرید ${name(quickProduct)}`
              : `Shop ${name(quickProduct)}`
            : fa
              ? "خرید سریع"
              : "Quick shop"
        }
        onClose={() => {
          setQuickProduct(null);
          trigger.current?.focus();
        }}
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            event.currentTarget.close();
        }}
      >
        <div className="eloria-quick-content">
          <button
            type="button"
            autoFocus
            className="eloria-dialog-close"
            aria-label={fa ? "بستن" : "Close"}
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
          {quickProduct && (
            <>
              <h2 className="mb-4 text-xl">{name(quickProduct)}</h2>
              <LivePurchaseBox
                key={quickProduct.slug}
                slug={quickProduct.slug}
                locale={locale}
              />
              <TreasuryLink
                className="mt-5 block text-center text-xs"
                href={`/${locale}/products/${encodeURIComponent(quickProduct.slug)}`}
                direction="up"
                onClick={() => dialog.current?.close()}
              >
                {fa ? "مشخصات کامل و انتخاب مدل" : "Full details and options"} ↗
              </TreasuryLink>
            </>
          )}
        </div>
      </dialog>
    </section>
  );
}
