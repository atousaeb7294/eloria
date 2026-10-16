"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TreasuryLink } from "@/components/treasury-transition";
import { startPalaceEntry } from "./palace-entry";
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
type Treasury = (typeof destinations)[number]["slug"];
type Artwork = typeof assets.desktop;
type CatalogItem = { name: string; slug: string };

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

function normalizedName(value: string) {
  return value.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\s\u200c\u064b-\u065f]/g, "").toLowerCase();
}

const featured = [
  ...assets.products,
  { id: "quiet-fire", name: "آتش خاموش", image: null },
  { id: "white-heart", name: "دلبر سپید", image: null },
  { id: "red-cheek", name: "رخ سرخ", image: null },
  { id: "azure", name: "در نیلگون", image: null },
];

export function HomePalace() {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  const entering = useRef(false);
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warmed = useRef(new Set<string>());
  const [opened, setOpened] = useState<Treasury | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);

  useEffect(() => {
    const reset = () => { entering.current = false; setOpened(null); };
    window.addEventListener("pageshow", reset);
    return () => {
      window.removeEventListener("pageshow", reset);
      if (releaseTimer.current !== null) clearTimeout(releaseTimer.current);
    };
  }, []);

  function warm(slug: Treasury) {
    const connection = (navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "") || warmed.current.has(slug)) return;
    warmed.current.add(slug);
    router.prefetch(`/fa/collections/${slug}`);
  }

  function enter(slug: Treasury, event: { preventDefault: () => void }) {
    if (entering.current) { event.preventDefault(); return; }
    entering.current = true;
    setOpened(slug);
    // Native navigation starts now. No await, modal or animation gate.
    if (root.current) startPalaceEntry(root.current, slug);
    releaseTimer.current = setTimeout(() => {
      entering.current = false;
      setOpened(null);
    }, 1200);
  }

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const controller = new AbortController();
    let disposed = false, started = false, nearby = false, introFinished = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;
    function start() {
      if (started || disposed || !nearby || (!introFinished && document.querySelector(".eloria-intro-root"))) return;
      started = true;
      observer?.disconnect();
      timeout = setTimeout(() => controller.abort(), 5000);
      void fetch("/api/treasury/preview?locale=fa", { signal: controller.signal })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (disposed || !Array.isArray(data?.items)) return;
          setCatalog(data.items.filter((item: unknown): item is CatalogItem => {
            if (!item || typeof item !== "object") return false;
            const value = item as Partial<CatalogItem>;
            return typeof value.name === "string" && typeof value.slug === "string" && value.slug.length <= 240;
          }).slice(0, 15));
        }).catch(() => { /* Reference photos and real search links remain available. */ })
        .finally(() => clearTimeout(timeout));
    }
    const onIntroComplete = () => { introFinished = true; start(); };
    window.addEventListener("eloria:intro-complete", onIntroComplete);
    if (typeof IntersectionObserver === "undefined") { nearby = true; start(); }
    else {
      observer = new IntersectionObserver(entries => {
        nearby = entries.some(entry => entry.isIntersecting);
        if (nearby) start();
      }, { rootMargin: "400px" });
      observer.observe(element);
    }
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("eloria:intro-complete", onIntroComplete);
      controller.abort();
      clearTimeout(timeout);
    };
  }, []);

  function productHref(name: string) {
    const exact = catalog.find(item => normalizedName(item.name) === normalizedName(name));
    return exact ? `/fa/products/${encodeURIComponent(exact.slug)}` : `/fa/products?q=${encodeURIComponent(name)}`;
  }

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
                  loading="lazy" decoding="async" fetchPriority="low" />
              </picture>
              <picture className="ep-hinged-lid" aria-hidden="true">
                <source media={mobileMedia} srcSet={sourceSet(mobile.closed)}
                  sizes="(max-width: 774px) calc(100vw - 24px), 750px" type="image/webp" />
                <source media={desktopMedia} srcSet={sourceSet(assets.desktop)}
                  sizes="(max-width: 1392px) calc(100vw - 32px), 1360px" type="image/webp" />
                <img src={emptyPixel} alt="" width={1126} height={813}
                  loading="lazy" decoding="async" fetchPriority="low" />
              </picture>
              {/* Original lettering and bracelet photos sit over the edited scene. */}
              <ReferencePicture art={mobile.reference} media={mobileMedia} className="ep-reference-copy"
                sizes="(max-width: 774px) calc(100vw - 24px), 750px" />
              <div className="ep-photos" aria-label={`نمونه‌های ${name}`}>
                {[1, 2, 3].map(index => <TreasuryLink key={index} className={`ep-photo ep-photo-${index}`}
                  href={`/fa/collections/${slug}`} prefetch={false} showPending={false}
                  aria-label={`مشاهدهٔ نمونهٔ ${index} در ${name}`} onPointerEnter={() => warm(slug)}
                  onFocus={() => warm(slug)} onNavigate={event => enter(slug, event)} />)}
              </div>
              <TreasuryLink className="ep-enter" href={`/fa/collections/${slug}`}
                prefetch={false} showPending={false} onPointerEnter={() => warm(slug)}
                onPointerDown={() => warm(slug)} onFocus={() => warm(slug)} onNavigate={event => enter(slug, event)}>
                <span className="ep-sr-only">ورود به {name}</span>
              </TreasuryLink>
              <TreasuryLink className={`ep-chest-target ep-chest-${slug}`} href={`/fa/collections/${slug}`}
                prefetch={false} showPending={false} aria-label={`باز کردن صندوقچه و ورود به ${name}`}
                onPointerEnter={() => warm(slug)} onPointerDown={() => warm(slug)}
                onFocus={() => warm(slug)} onNavigate={event => enter(slug, event)} />
            </section>;
          })}
        </nav>
      </div>
      <section className="ep-featured" aria-labelledby="ep-featured-title">
        <h2 id="ep-featured-title" className="ep-section-title font-persian-title">منتخب‌های الوریا</h2>
        <ReferencePicture art={assets.featured} media={desktopMedia} className="ep-featured-art"
          sizes="(max-width: 1392px) calc(100vw - 32px), 1360px" />
        <div className="ep-featured-grid">
          {featured.map(({ id, name, image }) => <TreasuryLink key={id}
            className={`ep-featured-product${image ? "" : " ep-desktop-only"}`}
            href={productHref(name)} prefetch={false} aria-label={`مشاهدهٔ ${name}`}>
            {image && <ReferencePicture art={image} media={mobileMedia} className="ep-featured-image"
              sizes="(max-width: 774px) calc((100vw - 44px) / 2), 365px" alt={`دستبند ${name}؛ تصویر مرجع الوریا`} />}
            <span dir="rtl">{name}</span>
          </TreasuryLink>)}
        </div>
        <TreasuryLink className="ep-view-all" href="/fa/products" prefetch={false}>
          مشاهدهٔ همه <span aria-hidden="true">‹</span>
        </TreasuryLink>
      </section>
    </div>
  </section>;
}
