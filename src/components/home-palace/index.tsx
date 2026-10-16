"use client";

import { useLinkStatus } from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { TreasuryLink } from "@/components/treasury-transition";
import { ProductImage } from "@/components/product-image";
import { startPalaceEntry } from "./palace-entry";
import { featuredProducts, productHref, readPalaceProducts, treasuryProducts, type PalaceProduct, type Treasury } from "./palace-products";
import assets from "./palace-reference-assets.json";
import "./palace.css";

const emptyPixel = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
const mobileMedia = "(max-width: 900px)";
const desktopMedia = "(min-width: 901px)";
const destinations = [
  { slug: "gold", name: "گنجینهٔ طلا" },
  { slug: "silver", name: "گنجینهٔ نقره" },
  { slug: "weave", name: "گنجینهٔ بافت" },
] as const;
type Artwork = typeof assets.desktop;

function sourceSet(art: Artwork) {
  return art.variants.map(variant => `${variant.url} ${variant.width}w`).join(", ");
}

// Art-directed sources prevent a phone downloading the desktop scene as well.
// Native lazy loading also works before hydration and without the catalogue API.
function ReferencePicture({ art, media, className, sizes, alt = "" }: {
  art: Artwork; media?: string; className: string; sizes: string; alt?: string;
}) {
  return <picture className={className}>
    <source media={media} srcSet={sourceSet(art)} sizes={sizes} type="image/webp" />
    <img src={media ? emptyPixel : art.variants.at(-1)!.url}
      width={art.width} height={art.height} alt={alt}
      loading="lazy" decoding="async" fetchPriority="low" />
  </picture>;
}

// A cancelled navigation can settle without unmounting the home page.
// Reset only after a real pending navigation, never on an animation timer.
function EntryStatus({ treasury, onSettled }: { treasury: Treasury; onSettled: (treasury: Treasury) => void }) {
  const { pending } = useLinkStatus();
  const wasPending = useRef(false);
  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current) { wasPending.current = false; onSettled(treasury); }
  }, [pending, treasury, onSettled]);
  return null;
}

export function HomePalace() {
  const root = useRef<HTMLElement>(null);
  const [opened, setOpened] = useState<Treasury | null>(null);
  const [catalog, setCatalog] = useState<PalaceProduct[]>([]);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "unavailable">("loading");
  const reset = useCallback(() => setOpened(null), []);
  const settle = useCallback((treasury: Treasury) => setOpened(current => current === treasury ? null : current), []);

  useEffect(() => {
    window.addEventListener("pageshow", reset);
    window.addEventListener("popstate", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      window.removeEventListener("popstate", reset);
    };
  }, [reset]);

  const [warmed, setWarmed] = useState<Treasury[]>([]);
  const warm = useCallback((slug: Treasury) => {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "")) return;
    // Link's full prefetch also owns invalidation and deduplicates both links.
    setWarmed(current => current.includes(slug) ? current : [...current, slug]);
  }, []);

  function enter(slug: Treasury) {
    if (root.current) startPalaceEntry(root.current, slug);
    setOpened(slug);
    // Keep the actual chest open while Next renders the destination. There is
    // no cloned/zoomed scene, timed reset, text overlay or navigation gate.
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
      // Warm visible treasuries before a mobile tap; hover alone is too late.
      element?.querySelectorAll<HTMLElement>("[data-treasury]").forEach(bay => {
        const rect = bay.getBoundingClientRect();
        if (rect.bottom >= 0 && rect.top <= window.innerHeight + 200) warm(bay.dataset.treasury as Treasury);
      });
      if (inFlight || Date.now() - lastFetch < 15000 || document.visibilityState === "hidden") return;
      inFlight = true;
      lastFetch = Date.now();
      controller = new AbortController();
      timeout = setTimeout(() => controller?.abort(), 8000);
      void fetch("/api/treasury/preview?locale=fa", { signal: controller.signal })
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
  }, [warm]);
  const featured = featuredProducts(catalog);

  return <section id="treasury-gold" aria-label="گنجینه‌های الوریا" ref={root}>
    <div id="eloria-home-palace" className="ep-surface" dir="rtl">
      <div className="ep-stage" data-open={opened}>
        <ReferencePicture art={assets.desktop} media={desktopMedia} className="ep-desktop-art"
          sizes="(max-width: 1392px) calc(100vw - 32px), 1360px" />
        <div className="ep-braziers" aria-hidden="true">
          {["left", "right"].map(side => <ReferencePicture key={side} art={assets.brazier}
            media={desktopMedia} className={`ep-brazier ep-brazier-${side}`} sizes="110px" />)}
        </div>
        <nav className="ep-treasuries" aria-label="انتخاب و ورود به گنجینه">
          {destinations.map(({ slug, name }) => {
            const products = treasuryProducts(catalog, slug);
            const mobile = assets.mobile[slug];
            const desktop = assets.opened[slug];
            const rectangle = desktop.rectangle;
            const style = {
              "--ep-patch-left": `${rectangle.left / 1126 * 100}%`,
              "--ep-patch-top": `${rectangle.top / 813 * 100}%`,
              "--ep-patch-width": `${rectangle.width / 1126 * 100}%`,
              "--ep-patch-height": `${rectangle.height / 813 * 100}%`,
            } as CSSProperties;
            return <section key={slug} className={`ep-bay ep-bay-${slug}`}
              data-treasury={slug} data-open={opened === slug} style={style} aria-labelledby={`ep-title-${slug}`}>
              <h3 id={`ep-title-${slug}`} className="ep-sr-only">{name}</h3>
              <ReferencePicture art={mobile.closed} media={mobileMedia} className="ep-mobile-art"
                sizes="(max-width: 774px) calc(100vw - 24px), 750px" />
              <picture className="ep-open-patch" aria-hidden="true">
                <source media={mobileMedia} srcSet={sourceSet(mobile.open)}
                  sizes="(max-width: 774px) calc(100vw - 24px), 750px" type="image/webp" />
                <source media={desktopMedia} srcSet={sourceSet(desktop)} sizes="300px" type="image/webp" />
                <img src={emptyPixel} alt="" width={desktop.width} height={desktop.height}
                  loading="eager" decoding="async" fetchPriority="low" />
              </picture>
              <picture className="ep-hinged-lid" aria-hidden="true">
                <source media={mobileMedia} srcSet={sourceSet(mobile.closed)}
                  sizes="(max-width: 774px) calc(100vw - 24px), 750px" type="image/webp" />
                <source media={desktopMedia} srcSet={sourceSet(assets.desktop)}
                  sizes="(max-width: 1392px) calc(100vw - 32px), 1360px" type="image/webp" />
                <img src={emptyPixel} alt="" width={1126} height={813}
                  loading="lazy" decoding="async" fetchPriority="low" />
              </picture>
              {/* Preserve the scene and its frames; real product layers cover
                  the decorative samples before and after catalogue loading. */}
              <ReferencePicture art={mobile.reference} media={mobileMedia} className="ep-reference-copy"
                sizes="(max-width: 774px) calc(100vw - 24px), 750px" />
              <div className="ep-photos" aria-label={`نمونه‌های ${name}`}>
                {[0, 1, 2].map(index => {
                  const product = products[index];
                  const className = `ep-photo ep-photo-${index + 1}`;
                  return product ? <TreasuryLink key={product.slug} className={className}
                    href={productHref(product)} prefetch={false} showPending={false}
                    title={product.name} aria-label={`مشاهدهٔ ${product.name}`}>
                    <ProductImage src={product.imageUrl} alt={product.name} fill sizes="(max-width:900px) 17vw, 60px" />
                  </TreasuryLink> : <span key={index} className={`${className} ep-product-placeholder`} aria-hidden="true" />;
                })}
              </div>
              <TreasuryLink className="ep-enter" href={`/fa/collections/${slug}`}
                prefetch={warmed.includes(slug)} showPending={false} onPointerEnter={() => warm(slug)}
                onPointerDown={() => warm(slug)} onFocus={() => warm(slug)} onNavigate={() => enter(slug)}>
                <span className="ep-sr-only">ورود به {name}</span>
                <EntryStatus treasury={slug} onSettled={settle} />
              </TreasuryLink>
              <TreasuryLink className={`ep-chest-target ep-chest-${slug}`} href={`/fa/collections/${slug}`}
                prefetch={warmed.includes(slug)} showPending={false} aria-label={`باز کردن صندوقچه و ورود به ${name}`}
                onPointerEnter={() => warm(slug)} onPointerDown={() => warm(slug)}
                onFocus={() => warm(slug)} onNavigate={() => enter(slug)}>
                <EntryStatus treasury={slug} onSettled={settle} />
              </TreasuryLink>
            </section>;
          })}
        </nav>
      </div>
      <section className="ep-featured" aria-labelledby="ep-featured-title">
        <h2 id="ep-featured-title" className="ep-section-title font-persian-title">منتخب‌های الوریا</h2>
        <ReferencePicture art={assets.featured} media={desktopMedia} className="ep-featured-art"
          sizes="(max-width: 1392px) calc(100vw - 32px), 1360px" />
        <div className="ep-featured-grid">
          {featured.map((product, index) => {
            const className = `ep-featured-product${index >= 4 ? " ep-desktop-only" : ""}`;
            const contents = <>
              <div className="ep-featured-image">
                {product && <ProductImage src={product.imageUrl} alt={product.name} fill
                  sizes="(max-width:774px) calc((100vw - 44px) / 2), (max-width:900px) 365px, 260px" />}
              </div>
              <span className="ep-featured-name font-persian-title" dir="rtl">{product?.name ?? "—"}</span>
            </>;
            return product ? <TreasuryLink key={index} className={className}
              href={productHref(product)} prefetch={false} showPending={false} aria-label={`مشاهدهٔ ${product.name}`}>
              {contents}
            </TreasuryLink> : <div key={index} className={`${className} ep-product-placeholder`} aria-hidden="true">{contents}</div>;
          })}
        </div>
        <p className="ep-sr-only" role="status">{previewState === "loading" ? "در حال دریافت محصولات"
          : previewState === "unavailable" ? "نمایش محصولات موقتاً در دسترس نیست" : ""}</p>
        <TreasuryLink className="ep-view-all" href="/fa/products" prefetch={false} showPending={false}>
          مشاهدهٔ همه <span aria-hidden="true">‹</span>
        </TreasuryLink>
      </section>
    </div>
  </section>;
}
