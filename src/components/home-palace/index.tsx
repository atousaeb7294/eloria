"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type CSSProperties } from "react";
import { TreasuryLink } from "@/components/treasury-transition";
import { ProductImage } from "@/components/product-image";
import { PALACE_OPENING_MS, startPalaceEntry } from "./palace-entry";
import { featuredProducts, productHref, readPalaceProducts, treasuryProducts, type PalaceProduct, type Treasury } from "./palace-products";
import "./palace.css";

const destinations = [
  { slug: "gold", name: "گنجینهٔ طلا", story: "نقشی از آفتاب، برای ماندن" },
  { slug: "silver", name: "گنجینهٔ نقره", story: "روایتی آرام از روشنایی" },
  { slug: "weave", name: "گنجینهٔ بافت", story: "گره‌به‌گره، بافته از مهر" },
] as const;

function ChestArtwork({ slug, name }: { slug: Treasury; name: string }) {
  const src = `/images/palace/royal-20261019/${slug}.jpg`;
  return <div className="ep-chest-art">
    {/* Exact uploaded JPEGs: no resize, quality filter or second compression. */}
    <Image src={src} alt={`صندوقچهٔ ${name}`} width={1312} height={1199}
      unoptimized loading="lazy" decoding="async" className="ep-chest-base" />
    <span className="ep-chest-interior" aria-hidden="true" />
    <div className="ep-hinged-lid" aria-hidden="true">
      <Image src={src} alt="" width={1312} height={1199} unoptimized loading="lazy" decoding="async" />
    </div>
    <span className="ep-chest-light" aria-hidden="true" />
  </div>;
}

export function HomePalace() {
  const router = useRouter();
  const root = useRef<HTMLElement>(null);
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
    setOpened(null);
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
    setWarmed(current => current.includes(slug) ? current : [...current, slug]);
  }, []);

  function enter(event: { preventDefault: () => void }, slug: Treasury) {
    clearTimeout(entryTimer.current);
    if (root.current) startPalaceEntry(root.current, slug);
    setOpened(slug);
    // onNavigate preserves native new-tab, modifier-click and no-JS links.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
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
      element?.querySelectorAll<HTMLElement>("[data-treasury]").forEach(bay => {
        const rect = bay.getBoundingClientRect();
        if (rect.bottom >= 0 && rect.top <= window.innerHeight + 200) warm(bay.dataset.treasury as Treasury);
      });
      if (inFlight || Date.now() - lastFetch < 15000 || document.visibilityState === "hidden") return;
      inFlight = true;
      lastFetch = Date.now();
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 8000);
      void fetch("/api/treasury/preview?locale=fa", { signal: controller.signal, cache: "no-store" })
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
      element.querySelectorAll("[data-treasury]").forEach(bay => observer!.observe(bay));
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
    <div id="eloria-home-palace" className="ep-surface" dir="rtl"
      style={{ "--ep-opening-ms": `${PALACE_OPENING_MS}ms` } as CSSProperties}>
      <div className="ep-royal-veins" aria-hidden="true" />
      <header className="ep-heading">
        <span className="ep-eyebrow" lang="en">ELORIA · THE TREASURIES</span>
        <h2 id="ep-treasuries-title" className="font-persian-title">گنجینه‌های الوریا</h2>
        <p>هر صندوقچه، آغاز یک روایت</p>
      </header>
      <div className="ep-stage" data-open={opened}>
        <nav className="ep-treasuries" aria-label="انتخاب و ورود به گنجینه">
          {destinations.map(({ slug, name, story }) => {
            const products = treasuryProducts(catalog, slug);
            const linkProps = {
              href: `/fa/collections/${slug}`,
              prefetch: warmed.includes(slug),
              showPending: false,
              onPointerEnter: () => warm(slug),
              onPointerDown: () => warm(slug),
              onFocus: () => warm(slug),
              onNavigate: (event: { preventDefault: () => void }) => enter(event, slug),
            };
            return <section key={slug} className={`ep-bay ep-bay-${slug}`} dir="rtl"
              id={slug === "gold" ? "ep-bay-gold" : `treasury-${slug}`}
              data-treasury={slug} data-open={opened === slug} aria-labelledby={`ep-title-${slug}`}>
              <TreasuryLink {...linkProps} className={`ep-chest-target ep-chest-${slug}`}
                aria-label={`باز کردن صندوقچه و ورود به ${name}`}>
                <ChestArtwork slug={slug} name={name} />
              </TreasuryLink>
              <div className="ep-bay-content">
                <h3 id={`ep-title-${slug}`} className="ep-bay-title font-persian-title">{name}</h3>
                <p className="ep-bay-story">{story}</p>
                <div className="ep-photos" aria-label={`نمونه‌های ${name}`}>
                  {[0, 1, 2].map(index => {
                    const product = products[index];
                    return product ? <TreasuryLink key={product.slug} className="ep-photo"
                      href={productHref(product)} prefetch={false} showPending={false}
                      title={product.name} aria-label={`مشاهدهٔ ${product.name}`}>
                      <ProductImage src={product.imageUrl} alt={product.name} fill unoptimized
                        sizes="(max-width: 700px) 17vw, 92px" />
                    </TreasuryLink> : <span key={index} className="ep-photo ep-product-placeholder" aria-hidden="true"><span>✧</span></span>;
                  })}
                </div>
                <TreasuryLink {...linkProps} className="ep-enter">
                  <span>ورود به {name}</span><span className="ep-enter-mark" aria-hidden="true">‹</span>
                </TreasuryLink>
              </div>
            </section>;
          })}
        </nav>
        <p className="ep-entry-status" role="status" aria-live="polite">
          {opened ? `در حال باز کردن ${destinations.find(item => item.slug === opened)?.name}…` : ""}
        </p>
      </div>
      <section className="ep-featured" aria-labelledby="ep-featured-title">
        <div className="ep-featured-heading">
          <h2 id="ep-featured-title" className="ep-section-title font-persian-title">منتخب‌های الوریا</h2>
          <p>دست‌چین‌شده برای سلیقهٔ شما</p>
        </div>
        {featured.length > 0 ? <div className="ep-featured-grid">
          {featured.map(product => <TreasuryLink key={product.slug} className="ep-featured-product"
            href={productHref(product)} prefetch={false} showPending={false} aria-label={`مشاهدهٔ ${product.name}`}>
            <div className="ep-featured-image">
              <ProductImage src={product.imageUrl} alt={product.name} fill unoptimized
                sizes="(max-width: 700px) 45vw, (max-width: 1100px) 30vw, 400px" />
            </div>
            <span className="ep-featured-caption"><span className="ep-featured-name">{product.name}</span>
              <span aria-hidden="true">‹</span></span>
          </TreasuryLink>)}
        </div> : <p className="ep-catalog-status" role="status">{status}</p>}
        {previewState === "unavailable" && <div className="ep-retry">
          {featured.length > 0 && <p role="status">به‌روزرسانی تصاویر موقتاً ممکن نیست.</p>}
          <button type="button" onClick={() => { setPreviewState("loading"); setRefreshKey(key => key + 1); }}>تلاش دوباره</button>
        </div>}
        <noscript><p className="ep-catalog-status">برای دیدن همهٔ آثار، وارد گنجینه‌ها یا فروشگاه شوید.</p></noscript>
        <TreasuryLink className="ep-view-all" href="/fa/products" prefetch={false} showPending={false}>
          مشاهدهٔ همهٔ آثار <span aria-hidden="true">‹</span>
        </TreasuryLink>
      </section>
    </div>
  </section>;
}
