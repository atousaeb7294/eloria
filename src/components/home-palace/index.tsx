"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { TreasuryLink } from "@/components/treasury-transition";
import { ProductImage } from "@/components/product-image";
import { PALACE_OPENING_MS, startPalaceEntry } from "./palace-entry";
import { CHEST_FRAMES, ENTRY_FRAMES, PREVIEW_FRAMES, FEATURED_FRAMES, SCENES, MOBILE_SCENE_QUERY, frameStyle, type ResponsiveRect } from "./palace-scene";
import { createChestMotion, type ChestMotion } from "./palace-scene-motion";
import { featuredProducts, productHref, readPalaceProducts, treasuryProducts, type PalaceProduct, type Treasury } from "./palace-products";
import "./palace.css";

const destinations = [
  { slug: "gold", name: "گنجینهٔ طلا", story: "نقشی از آفتاب، برای ماندن" },
  { slug: "silver", name: "گنجینهٔ نقره", story: "روایتی آرام از روشنایی" },
  { slug: "weave", name: "گنجینهٔ بافت", story: "گره‌به‌گره، بافته از مهر" },
] as const;

function ProductFrame({ product, frame, featured = false, fallbackHref, fallbackName }: {
  product?: PalaceProduct; frame: ResponsiveRect; featured?: boolean; fallbackHref: string; fallbackName: string;
}) {
  return <TreasuryLink className={featured ? "ep-featured-product" : "ep-photo"}
    style={frameStyle(frame)} data-product-slot="true" data-product-present={Boolean(product)}
    href={product ? productHref(product) : fallbackHref} prefetch={false} showPending={false}
    title={product?.name ?? fallbackName} aria-label={product ? `مشاهدهٔ ${product.name}` : fallbackName}>
    {product ? <>
      <ProductImage src={product.imageUrl} alt={product.name} fill quality={92} unoptimized={!product.imageUrl.startsWith("/")} loading="lazy" decoding="async"
        sizes={featured ? "(max-width: 767px) 44vw, 26vw" : "(max-width: 767px) 16vw, 8vw"} />
      <span className="ep-product-name">{product.name}</span>
    </> : <span className="ep-slot-placeholder"><span aria-hidden="true">✧</span><span>مشاهدهٔ آثار</span></span>}
  </TreasuryLink>;
}

export function HomePalace() {
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
  const motion = useRef<ChestMotion | null>(null);
  const entryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const ownNavigation = useRef(false);
  const wasPending = useRef(false);
  const [isPending, startTransition] = useTransition();
  const [opened, setOpened] = useState<Treasury | null>(null);
  const [catalog, setCatalog] = useState<PalaceProduct[]>([]);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const [warmed, setWarmed] = useState<Treasury[]>([]);

  const reset = useCallback(() => {
    clearTimeout(entryTimer.current);
    entryTimer.current = undefined;
    motion.current?.reset();
    setOpened(null);
  }, []);

  useEffect(() => {
    if (!root.current) return;
    const controller = createChestMotion(root.current);
    motion.current = controller;
    return () => { controller.destroy(); motion.current = null; };
  }, []);

  useEffect(() => {
    const otherNavigation = () => { if (!ownNavigation.current) reset(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") reset(); };
    window.addEventListener("pageshow", reset);
    window.addEventListener("popstate", reset);
    window.addEventListener("eloria:navigate", otherNavigation);
    window.addEventListener("keydown", escape);
    return () => {
      clearTimeout(entryTimer.current);
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("popstate", reset);
      window.removeEventListener("eloria:navigate", otherNavigation);
      window.removeEventListener("keydown", escape);
    };
  }, [reset]);

  useEffect(() => {
    if (isPending) wasPending.current = true;
    else if (wasPending.current) { wasPending.current = false; reset(); }
  }, [isPending, reset]);

  const warm = useCallback((slug: Treasury) => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
    motion.current?.warm();
    setWarmed(current => current.includes(slug) ? current : [...current, slug]);
  }, []);

  function enter(event: { preventDefault: () => void }, slug: Treasury) {
    clearTimeout(entryTimer.current);
    motion.current?.reset();
    // Native modifier/new-tab/no-JS links survive because this runs in onNavigate.
    // Never delay navigation if motion is disabled or artwork has not loaded.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !motion.current?.open(slug)) return;
    if (root.current) startPalaceEntry(root.current, slug);
    setOpened(slug);
    event.preventDefault();
    entryTimer.current = setTimeout(() => {
      entryTimer.current = undefined;
      ownNavigation.current = true;
      window.dispatchEvent(new Event("eloria:navigate"));
      ownNavigation.current = false;
      startTransition(() => router.push(`/fa/collections/${slug}`, { transitionTypes: [] }));
    }, PALACE_OPENING_MS);
  }

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    let controller: AbortController | undefined;
    let disposed = false, inFlight = false, nearby = false, introFinished = false;
    let lastFetch = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;
    function start() {
      if (disposed || !nearby || (!introFinished && document.querySelector(".eloria-intro-root"))) return;
      element?.querySelectorAll<HTMLElement>("[data-treasury-target]").forEach(bay => {
        const rect = bay.getBoundingClientRect();
        if (rect.bottom >= 0 && rect.top <= window.innerHeight + 200) warm(bay.dataset.treasuryTarget as Treasury);
      });
      if (inFlight || Date.now() - lastFetch < 15000 || document.visibilityState === "hidden") return;
      inFlight = true;
      lastFetch = Date.now();
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 8000);
      void fetch("/api/treasury/preview?locale=fa", { signal: controller.signal, cache: "default" })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (disposed) return;
          if (!Array.isArray(data?.items) || data.source === "unavailable") throw new Error("Preview unavailable");
          setCatalog(readPalaceProducts(data.items));
          setPreviewState("ready");
        }).catch(() => { if (!disposed) setPreviewState("unavailable"); })
        .finally(() => { inFlight = false; clearTimeout(timeout); });
    }
    const onIntroComplete = () => { introFinished = true; start(); };
    window.addEventListener("eloria:intro-complete", onIntroComplete);
    window.addEventListener("focus", start);
    window.addEventListener("online", start);
    document.addEventListener("visibilitychange", start);
    const refreshTimer = setInterval(start, 60000);
    if (typeof IntersectionObserver === "undefined") { nearby = true; start(); }
    else {
      const intersecting = new Set<Element>();
      observer = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersecting.add(entry.target);
          else intersecting.delete(entry.target);
        }
        nearby = intersecting.size > 0;
        if (nearby) start();
      }, { rootMargin: "400px" });
      observer.observe(element);
      element.querySelectorAll("[data-treasury-target]").forEach(bay => observer!.observe(bay));
    }
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("eloria:intro-complete", onIntroComplete);
      window.removeEventListener("focus", start);
      window.removeEventListener("online", start);
      document.removeEventListener("visibilitychange", start);
      clearInterval(refreshTimer);
      controller?.abort();
      clearTimeout(timeout);
    };
  }, [warm, refreshKey]);

  const featured = featuredProducts(catalog);
  const status = previewState === "loading" ? "در حال دریافت آثار…"
    : previewState === "unavailable" ? "دریافت تصاویر محصولات موقتاً ممکن نیست."
      : "منتخب‌های تازه به‌زودی در اینجا قرار می‌گیرند.";

  return <section id="treasury-gold" aria-labelledby="ep-treasuries-title" ref={root}>
    <div id="eloria-home-palace" className="ep-surface" dir="rtl">
      <h2 id="ep-treasuries-title" className="ep-sr-only">گنجینه‌های الوریا</h2>
      <div className="ep-stage" data-open={opened}>
        <picture className="ep-scene-picture" aria-hidden="true">
          <source media={MOBILE_SCENE_QUERY} srcSet={SCENES.mobile.src} width={850} height={1850} />
          {/* The entire reference is served byte-for-byte, without a cover crop. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SCENES.desktop.src} width={1584} height={993} alt="" loading="lazy" decoding="async" />
        </picture>
        <canvas className="ep-chest-motion" aria-hidden="true" />
        <nav className="ep-treasuries" aria-label="انتخاب و ورود به گنجینه">
          {destinations.map(({ slug, name }) => {
            const products = treasuryProducts(catalog, slug);
            const linkProps = {
              href: `/fa/collections/${slug}`, prefetch: warmed.includes(slug), showPending: false,
              onPointerEnter: () => warm(slug), onPointerDown: () => warm(slug), onFocus: () => warm(slug),
              onNavigate: (event: { preventDefault: () => void }) => enter(event, slug),
            };
            return <section key={slug} className={`ep-bay ep-bay-${slug}`} data-treasury={slug}
              data-open={opened === slug} aria-labelledby={`ep-title-${slug}`}>
              <h3 id={`ep-title-${slug}`} className="ep-sr-only">{name}</h3>
              <TreasuryLink {...linkProps} className="ep-chest-target" style={frameStyle(CHEST_FRAMES[slug])}
                id={slug === "gold" ? "ep-bay-gold" : `treasury-${slug}`} data-treasury-target={slug}
                aria-label={`باز کردن صندوقچه و ورود به ${name}`}><span className="ep-sr-only">{name}</span></TreasuryLink>
              <div className="ep-photos" aria-label={`نمونه‌های ${name}`}>
                {PREVIEW_FRAMES[slug].map((frame, index) => <ProductFrame key={index} frame={frame}
                  product={products[index]} fallbackHref={`/fa/collections/${slug}`} fallbackName={`مشاهدهٔ همهٔ آثار ${name}`} />)}
              </div>
              <TreasuryLink {...linkProps} className="ep-enter" style={frameStyle(ENTRY_FRAMES[slug])}>
                <span className="ep-sr-only">ورود به {name}</span>
              </TreasuryLink>
            </section>;
          })}
        </nav>
        <section className="ep-featured" aria-labelledby="ep-featured-title">
          <h2 id="ep-featured-title" className="ep-sr-only">منتخب‌های الوریا، دست‌چین‌شده برای سلیقهٔ شما</h2>
          <div className="ep-featured-grid">
            {FEATURED_FRAMES.map((frame, index) => <ProductFrame key={index} featured frame={frame}
              product={featured[index]} fallbackHref="/fa/products" fallbackName="مشاهدهٔ همهٔ محصولات الوریا" />)}
          </div>
        </section>
      </div>
      <div className="ep-scene-footer">
        <p className="ep-entry-status" role="status" aria-live="polite">
          {opened ? `در حال باز کردن ${destinations.find(item => item.slug === opened)?.name}…` : ""}
        </p>
        {previewState !== "ready" && <p className="ep-catalog-status" role="status">{status}</p>}
        {previewState === "unavailable" && <button type="button" className="ep-retry"
          onClick={() => { setPreviewState("loading"); setRefreshKey(key => key + 1); }}>تلاش دوباره</button>}
        <noscript><p className="ep-catalog-status">برای تصاویر زندهٔ محصولات، جاوااسکریپت را فعال کنید. لینک گنجینه‌ها و فروشگاه فعال است.</p></noscript>
        <TreasuryLink className="ep-view-all" href="/fa/products" prefetch={false} showPending={false}>
          مشاهدهٔ همهٔ آثار <span aria-hidden="true">‹</span>
        </TreasuryLink>
      </div>
    </div>
  </section>;
}
