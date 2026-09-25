"use client";

import Image from "next/image";
import { ProductImage } from "@/components/product-image";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { mountTreasuryStory } from "@/lib/treasury-story";
import { TreasuryLink } from "@/components/treasury-transition";
import { treasuryEditorial, type TreasurySlug } from "@/lib/treasury-editorial";

type Featured = {
  slug: string;
  name: string;
  imageUrl: string;
  hasGold?: boolean;
  hasSilver?: boolean;
  material?: string;
};

function Chapter({
  children,
  id,
  index,
  intro = false,
  entrance = "gold",
}: {
  children: ReactNode;
  id: string;
  index: number;
  intro?: boolean;
  entrance?: TreasurySlug;
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      data-promenade-chapter
      data-treasury-entrance={intro ? undefined : entrance}
      className={`eloria-promenade-chapter${intro ? " is-intro" : ""}`}
      style={{ zIndex: index + 1 }}
    >
      <div className="eloria-promenade-surface">{children}</div>
    </section>
  );
}

function belongs(item: Featured, slug: TreasurySlug) {
  const gold = item.hasGold ?? item.material === "GOLD";
  const silver = item.hasSilver ?? item.material === "SILVER";
  return slug === "gold" ? gold : slug === "silver" ? silver : !gold && !silver;
}

export function TreasuryPromenade({
  locale,
  children,
}: {
  locale: string;
  children: ReactNode;
}) {
  const fa = locale === "fa";
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(
    () => (root.current ? mountTreasuryStory(root.current) : undefined),
    [],
  );
  const [items, setItems] = useState<Featured[]>([]);
  const [previewState, setPreviewState] = useState<"loading" | "ready" | "unavailable">("loading");
  useEffect(() => {
    let controller: AbortController | undefined;
    let disposed = false;
    let timeout = 0;
    let lastFetch = 0;
    const refresh = () => {
      if (
        document.visibilityState === "hidden" ||
        Date.now() - lastFetch < 15000
      )
        return;
      lastFetch = Date.now();
      controller?.abort();
      window.clearTimeout(timeout);
      controller = new AbortController();
      timeout = window.setTimeout(() => controller?.abort(), 8000);
      void fetch(`/api/treasury/preview?locale=${encodeURIComponent(locale)}`, {
        signal: controller.signal,
      })
        .then((response) => (response.ok ? response.json() : null))
        .then((data: { items?: Featured[]; source?: string } | null) => {
          if (disposed) return;
          if (Array.isArray(data?.items) && data?.source !== "unavailable") {
            setItems(data.items);
            setPreviewState("ready");
          } else setPreviewState("unavailable");
        })
        .catch(() => { if (!disposed) setPreviewState("unavailable"); })
        .finally(() => window.clearTimeout(timeout));
    };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const retry = window.setInterval(refresh, 60000);
    return () => {
      disposed = true;
      controller?.abort();
      window.clearTimeout(timeout);
      window.clearInterval(retry);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [locale]);

  const groupedItems = useMemo(
    () =>
      Object.fromEntries(
        treasuryEditorial.map((treasury) => [
          treasury.slug,
          items.filter((item) => belongs(item, treasury.slug)).slice(0, 5),
        ]),
      ) as Record<TreasurySlug, Featured[]>,
    [items],
  );

  return (
    <div ref={root} className="eloria-promenade" dir={fa ? "rtl" : "ltr"}>
      <div className="eloria-promenade-stage">
        <Chapter index={0} id="promenade-intro" intro>
          {children}
        </Chapter>
        {treasuryEditorial.map((treasury, index) => {
          const products = groupedItems[treasury.slug];
          const collectionHref = `/${locale}/collections/${treasury.slug}`;
          return (
            <Chapter
              index={index + 1}
              id={`treasury-${treasury.slug}`}
              key={treasury.slug}
              entrance={treasury.slug}
            >
              <article
                className={`eloria-treasury-scene eloria-treasury-${treasury.slug}`}
              >
                <div className="eloria-treasury-backdrop-layer">
                  <Image
                    src={treasury.slug === "gold"
                      ? "/images/treasuries/gold-macrame-v2.webp"
                      : `/images/treasuries/${treasury.slug}.webp`}
                    alt=""
                    fill
                    sizes="100vw"
                    className="eloria-treasury-backdrop"
                    loading="eager"
                  />
                </div>
                <div className="eloria-treasury-shade" />
                <div className="eloria-treasury-counter" aria-hidden="true">
                  <span>0{index + 1}</span>
                  <i />
                  <span>03</span>
                </div>
                <TreasuryLink
                  href={collectionHref}
                  className="eloria-treasury-main-link"
                  aria-label={
                    fa ? `مشاهدهٔ ${treasury.fa}` : `View ${treasury.en}`
                  }
                />
                <div className="eloria-treasury-rail-wrap">
                  <nav
                    className="eloria-treasury-miniatures"
                    aria-label={
                      fa ? `آثار ${treasury.fa}` : `${treasury.en} creations`
                    }
                    data-native-scroll
                  >
                    {products.map((item) => (
                      <TreasuryLink
                        key={item.slug}
                        direction="up"
                        href={`/${locale}/products/${encodeURIComponent(item.slug)}`}
                        title={item.name}
                        aria-label={item.name}
                      >
                        <ProductImage
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                        sizes="52px"
                          className="object-cover"
                        />
                      </TreasuryLink>
                    ))}
                  </nav>
                  {products.length === 0 && (
                    <p className="eloria-treasury-empty">
                      {previewState === "loading"
                        ? fa ? "در حال دریافت آثار…" : "Loading creations…"
                        : previewState === "unavailable"
                          ? fa ? "پیش‌نمایش آثار موقتاً در دسترس نیست" : "Previews are temporarily unavailable"
                          : fa ? "برای دیدن آثار، وارد گنجینه شوید" : "Explore the treasury to discover its creations"}
                    </p>
                  )}
                  <p className="eloria-treasury-invite">
                    {fa
                      ? `آثار ${treasury.fa} را از نزدیک ببینید`
                      : `Discover the ${treasury.en.toLowerCase()} collection`}
                  </p>
                  <TreasuryLink
                    href={collectionHref}
                    className="eloria-treasury-enter"
                  >
                    <span>{fa ? `ورود و خرید از ${treasury.fa}` : `Shop ${treasury.en.toLowerCase()}`}</span>
                    <span className="eloria-enter-mark" aria-hidden="true" />
                  </TreasuryLink>
                </div>
                <a
                  className="eloria-treasury-next"
                  href={
                    index < treasuryEditorial.length - 1
                      ? `#treasury-${treasuryEditorial[index + 1].slug}`
                      : "#promenade-end"
                  }
                  aria-label={fa ? "ادامه" : "Continue"}
                >
                  <span>{fa ? "ادامه" : "Scroll"}</span>
                  <span aria-hidden="true">↓</span>
                </a>
              </article>
            </Chapter>
          );
        })}
        <nav
          className="eloria-story-navigation"
          aria-label={fa ? "فصل‌های الوریا" : "Eloria chapters"}
        >
          <a
            href="#promenade-intro"
            data-story-go="0"
            aria-label={fa ? "آغاز روایت" : "The beginning"}
          >
            <span>۰</span>
          </a>
          {treasuryEditorial.map((treasury, index) => (
            <a
              key={treasury.slug}
              href={`#treasury-${treasury.slug}`}
              data-story-go={index + 1}
              aria-label={fa ? treasury.fa : treasury.en}
            >
              <span>{fa ? treasury.titleFa : treasury.titleEn}</span>
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
