"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Gem, Sparkles, Circle } from "lucide-react";
import { TreasuryLink } from "@/components/treasury-transition";
import { ProductImage } from "@/components/product-image";
import type { PalaceProduct } from "./palace-runtime";
import assets from "./palace-photo-assets.json";
import "./palace.css";

const destinations = [
  { slug: "gold", name: "گنجینهٔ طلا", Icon: Gem },
  { slug: "silver", name: "گنجینهٔ نقره", Icon: Circle },
  { slug: "weave", name: "گنجینهٔ بافت", Icon: Sparkles },
] as const;

function isProduct(value: unknown): value is PalaceProduct {
  if (!value || typeof value !== "object") return false;
  const p = value as Partial<PalaceProduct>;
  return typeof p.slug === "string" && typeof p.name === "string" &&
    typeof p.imageUrl === "string" &&
    (p.imageUrl.startsWith("/api/media/") || p.imageUrl.startsWith("/images/"));
}
function belongs(p: PalaceProduct, slug: string) {
  const gold = p.hasGold ?? p.material === "GOLD";
  const silver = p.hasSilver ?? p.material === "SILVER";
  return slug === "gold" ? gold : slug === "silver" ? silver : !gold && !silver;
}

export function HomePalace() {
  const root = useRef<HTMLElement>(null);
  const router = useRouter();
  const releaseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entering = useRef(false);
  const warmed = useRef(new Set<string>());
  const [artReady, setArtReady] = useState(false);
  const [opened, setOpened] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<PalaceProduct[]>([]);
  const [catalogState, setCatalogState] = useState("loading");

  useEffect(() => () => {
    if (releaseTimer.current !== null) clearTimeout(releaseTimer.current);
  }, []);

  function warm(slug: string) {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData || /(^|-)2g$/.test(connection?.effectiveType ?? "") || warmed.current.has(slug)) return;
    warmed.current.add(slug);
    router.prefetch(`/fa/collections/${slug}`);
  }

  function enter(slug: string, event: { preventDefault: () => void }) {
    if (entering.current) { event.preventDefault(); return; }
    entering.current = true;
    setOpened(slug);
    // Do not cancel or delay the native Next Link navigation for the animation.
    releaseTimer.current = setTimeout(() => { entering.current = false; setOpened(null); }, 1500);
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
      setArtReady(true);
      observer?.disconnect();
      timeout = setTimeout(() => controller.abort(), 8000);
      void fetch("/api/treasury/preview?locale=fa", { signal: controller.signal })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (disposed) return;
          if (data?.source !== "unavailable" && Array.isArray(data?.items)) {
            const items = data.items.filter(isProduct).slice(0, 15) as PalaceProduct[];
            setCatalog([...new Map(items.map(p => [p.slug, p])).values()]);
            setCatalogState(items.length ? "ready" : "empty");
          } else setCatalogState("unavailable");
        }).catch(() => { if (!disposed) setCatalogState("unavailable"); })
        .finally(() => clearTimeout(timeout));
    }
    const onIntroComplete = () => { introFinished = true; start(); };
    window.addEventListener("eloria:intro-complete", onIntroComplete);
    if (typeof IntersectionObserver === "undefined") { nearby = true; start(); }
    else {
      observer = new IntersectionObserver(entries => {
        nearby = entries.some(entry => entry.isIntersecting);
        if (nearby) start();
      }, { rootMargin: "600px" });
      observer.observe(element);
    }
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("eloria:intro-complete", onIntroComplete);
      controller.abort(); clearTimeout(timeout);
    };
  }, []);

  const style = {
    "--ep-hall": artReady ? `url("${assets.hall[0].url}")` : undefined,
    "--ep-sprites": artReady ? `url("${assets.chests[0].url}")` : undefined,
    "--ep-rugs": artReady ? `url("${assets.rugs[0].url}")` : undefined,
    "--ep-decor": artReady ? `url("${assets.decor[0].url}")` : undefined,
  } as CSSProperties;
  return (
    <section id="treasury-gold" aria-label="گنجینه‌های الوریا" ref={root}>
      <div id="eloria-home-palace" dir="rtl" style={style}>
        <div className="ep-stage" data-open={opened}>
          {artReady && <picture className="ep-hall-picture">
            <img className="ep-backplate" alt="" width={1536} height={1024}
              src={assets.hall[0].url} loading="eager" fetchPriority="low" decoding="async" />
          </picture>}
          <nav className="ep-treasuries" aria-label="انتخاب و ورود به گنجینه">
            {destinations.map(({ slug, name, Icon }) => {
              const products = catalog.filter(p => belongs(p, slug)).slice(0, 3);
              return <section key={slug} className={`ep-bay ep-bay-${slug}`} data-open={opened === slug}>
                <div className="ep-treasury">
                  <span className="ep-flag-art" aria-hidden="true" />
                  <div className="ep-flag-content">
                  <ProductImage className="ep-brand-logo" src="/images/brand/eloria-logo.webp" width={36} height={25} alt="گالری الوریا" loading="lazy" />
                  <h3 className="ep-card-title font-persian-title">{name}</h3>
                  <div className="ep-photos">
                    {products.length ? products.map(product => <TreasuryLink key={product.slug}
                      className="ep-photo" prefetch={false} href={`/fa/products/${encodeURIComponent(product.slug)}`}
                      aria-label={product.name} title={product.name}>
                      <ProductImage src={product.imageUrl} alt={product.name} fill
                        sizes="(max-width: 900px) 52px, 64px" quality={92} />
                    </TreasuryLink>) : <span className="ep-symbol" aria-hidden="true"><Icon /></span>}
                  </div>
                  <TreasuryLink prefetch={false} className="ep-enter" href={`/fa/collections/${slug}`}
                    onPointerEnter={() => warm(slug)} onFocus={() => warm(slug)}
                    onNavigate={event => enter(slug, event)}>
                    <span aria-hidden="true" className="ep-enter-ornament">✦</span>{opened === slug ? "در حال ورود…" : "ورود به گنجینه"}<span aria-hidden="true" className="ep-enter-ornament">✦</span>
                  </TreasuryLink>
                  </div>
                </div>
                <div className="ep-chest-scene">
                <span className="ep-rug" aria-hidden="true" />
                <TreasuryLink prefetch={false} className={`ep-chest-target ep-chest-${slug}`} href={`/fa/collections/${slug}`}
                  aria-label={`باز کردن صندوقچه و ورود به ${name}`} onPointerEnter={() => warm(slug)} onFocus={() => warm(slug)}
                    onNavigate={event => enter(slug, event)}>
                  <span className="ep-chest-art" aria-hidden="true"><span className="ep-chest-closed" /><span className="ep-chest-open" /></span>
                </TreasuryLink>
                </div>
              </section>;
            })}
          </nav>
        </div>
        <section className="ep-featured" aria-labelledby="ep-featured-title">
          <h2 id="ep-featured-title" className="ep-section-title font-persian-title">منتخب‌های الوریا</h2>
          {catalog.length ? <div className="ep-featured-grid">
            {catalog.slice(0, 12).map(product => <TreasuryLink className="ep-featured-product" key={product.slug}
              prefetch={false} href={`/fa/products/${encodeURIComponent(product.slug)}`}>
              <div className="ep-featured-image"><ProductImage src={product.imageUrl} alt={product.name} fill
                sizes="(max-width: 900px) 160px, 180px" quality={92} /></div>
              <span>{product.name}</span>
            </TreasuryLink>)}
          </div> : <p className="ep-featured-empty" role="status">
            {catalogState === "loading" ? "در حال دریافت منتخب‌های الوریا…" : catalogState === "empty" ? "هنوز اثری برای نمایش موجود نیست." : "دریافت تصاویر محصولات موقتاً امکان‌پذیر نیست."}
          </p>}
        </section>
      </div>
    </section>
  );
}
