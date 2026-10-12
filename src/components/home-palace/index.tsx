"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Gem, Sparkles, Circle } from "lucide-react";
import { TreasuryLink } from "@/components/treasury-transition";
import { ProductImage } from "@/components/product-image";
import type { PalaceProduct } from "./palace-runtime";
import { palaceMarkup } from "./palace-markup";
import assets from "./palace-assets.json";
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
  const scene = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [catalog, setCatalog] = useState<PalaceProduct[]>([]);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const element = root.current;
    const world = scene.current;
    if (!element || !world) return;
    const controller = new AbortController();
    let disposed = false, started = false, nearby = false, introFinished = false;
    let cleanup: (() => void) | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let observer: IntersectionObserver | undefined;
    function start() {
      if (started || disposed || !nearby || (!introFinished && document.querySelector(".eloria-intro-root"))) return;
      started = true;
      observer?.disconnect();
      timeout = setTimeout(() => controller.abort(), 8000);
      // The scene and links are already visible. A slow database only affects thumbnails.
      void fetch("/api/treasury/preview?locale=fa", { signal: controller.signal })
        .then(response => response.ok ? response.json() : null)
        .then(data => {
          if (!disposed && data?.source !== "unavailable" && Array.isArray(data?.items)) {
            setCatalog(data.items.filter(isProduct).slice(0, 15));
          }
        }).catch(() => {}).finally(() => clearTimeout(timeout));
      const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
      // Mobile uses the same photo-textured chests without downloading/initializing Three.js.
      if (window.matchMedia("(max-width: 900px), (prefers-reduced-motion: reduce)").matches || connection?.saveData) return;
      void import("./palace-runtime").then(runtime => {
        if (!disposed) cleanup = runtime.mountHomePalace(world!, {
          navigateToTreasury(slug) {
            window.dispatchEvent(new Event("eloria:navigate"));
            router.push(`/fa/collections/${slug}`, { transitionTypes: [] });
          },
        });
      }).catch(() => { world!.dataset.mode = "lite"; });
    }
    const onIntroComplete = () => { introFinished = true; start(); };
    window.addEventListener("eloria:intro-complete", onIntroComplete);
    if (typeof IntersectionObserver === "undefined") { nearby = true; start(); }
    else {
      observer = new IntersectionObserver(entries => {
        nearby = entries.some(entry => entry.isIntersecting);
        if (nearby) start();
      }, { rootMargin: "160px" });
      observer.observe(element);
    }
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("eloria:intro-complete", onIntroComplete);
      controller.abort();clearTimeout(timeout);cleanup?.();
    };
  }, [router]);

  const style = {
    "--ep-atlas-mobile": `url("${assets["chest-atlas"][0].url}")`,
    "--ep-atlas-desktop": `url("${assets["chest-atlas"][1].url}")`,
  } as CSSProperties;
  return (
    <section id="treasury-gold" aria-label="گنجینه‌های الوریا" ref={root}>
      <div id="eloria-home-palace" dir="rtl" style={style}>
        <header className="ep-header">
          <h2 className="ep-section-title font-persian-title">گنجینه‌های الوریا</h2>
        </header>
        <div className="ep-stage">
          {/* Pre-encoded responsive scenery; no cold server-side transformation. */}
          <picture>
          <source media="(max-width: 900px)" srcSet={assets.hall.slice(0, 2).map(v => `${v.url} ${v.width}w`).join(", ")} sizes="100vw" />
          <img className="ep-backplate" alt="تالار گالری الوریا" width={1672} height={941}
            src={assets.hall[1].url} srcSet={assets.hall.map(v => `${v.url} ${v.width}w`).join(", ")}
            sizes="100vw" loading="lazy" decoding="async" />
          </picture>
          <div ref={scene} className="ep-world" data-mode="lite" dangerouslySetInnerHTML={{ __html: palaceMarkup }} />
          <nav className="ep-treasuries" aria-label="انتخاب و ورود به گنجینه">
            {destinations.map(({ slug, name, Icon }) => {
              const products = catalog.filter(p => belongs(p, slug)).slice(0, 3);
              return <section key={slug} className="ep-treasury" data-active={active === slug}
                onFocusCapture={() => setActive(slug)}
                onPointerEnter={event => { if (event.pointerType === "mouse") setActive(slug); }}>
                <span className="ep-brand">گالری الوریا</span>
                <h3 className="ep-card-title font-persian-title">{name}</h3>
                <div className="ep-photos">
                  {products.length ? products.map(product => <TreasuryLink key={product.slug}
                    className="ep-photo" href={`/fa/products/${encodeURIComponent(product.slug)}`}
                    aria-label={product.name} title={product.name}>
                    <ProductImage src={product.imageUrl} alt={product.name} fill
                      sizes="(max-width: 600px) 28px, (max-width: 900px) 44px, 60px" />
                  </TreasuryLink>) : <span className="ep-symbol" aria-hidden="true"><Icon /></span>}
                </div>
                <TreasuryLink className="ep-enter" href={`/fa/collections/${slug}`}>
                  ورود به گنجینه <span aria-hidden="true">←</span>
                </TreasuryLink>
              </section>;
            })}
          </nav>
          <nav className="ep-chest-targets" aria-label="صندوقچه‌ها">
            {destinations.map(({ slug, name }) => <TreasuryLink key={slug}
              className={`ep-chest-target ep-chest-${slug}`} href={`/fa/collections/${slug}`} aria-label={`ورود به ${name}`} />)}
          </nav>
        </div>
      </div>
    </section>
  );
}
