"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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

function Chapter({ children, id, index, intro = false, entrance = "gold" }: {
  children: ReactNode;
  id: string;
  index: number;
  intro?: boolean;
  entrance?: TreasurySlug;
}) {
  return (
    <section id={id} data-promenade-chapter
      data-treasury-entrance={intro ? undefined : entrance}
      className={`eloria-promenade-chapter${intro ? " is-intro" : ""}`}
      style={{ zIndex: index + 1 }}>
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
  const [items, setItems] = useState<Featured[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/treasury/preview?locale=${encodeURIComponent(locale)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { items?: Featured[] } | null) => {
        if (Array.isArray(data?.items)) setItems(data.items);
      })
      .catch(() => undefined);
    return () => controller.abort();
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
    <div className="eloria-promenade" dir={fa ? "rtl" : "ltr"}>
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
                  src={`/images/treasuries/${treasury.slug}.webp`}
                  alt=""
                  fill
                  sizes="100vw"
                  className="eloria-treasury-backdrop"
                  loading={index === 0 ? "eager" : "lazy"}
                />
              </div>
              <div className="eloria-treasury-shade" />
              <div className="eloria-treasury-counter" aria-hidden="true">
                <span>0{index + 1}</span>
                <i />
                <span>03</span>
              </div>
              <div className="eloria-treasury-heading">
                <p className="eloria-treasury-eyebrow">
                  {fa ? treasury.fa : treasury.en}
                </p>
                <h2 className={fa ? "font-persian-title" : "font-serif"}>
                  {fa ? treasury.titleFa : treasury.titleEn}
                </h2>
                <p>{fa ? treasury.descriptionFa : treasury.descriptionEn}</p>
              </div>
              <TreasuryLink
                href={collectionHref}
                className="eloria-treasury-enter"
                aria-label={
                  fa ? `ورود به ${treasury.fa}` : `Enter ${treasury.en}`
                }
              >
                <span>{fa ? "ورود به گنجینه" : "Enter the treasury"}</span>
                <span aria-hidden="true">↗</span>
              </TreasuryLink>
              <TreasuryLink
                href={collectionHref}
                className="eloria-treasury-main-link"
                aria-label={
                  fa ? `مشاهدهٔ ${treasury.fa}` : `View ${treasury.en}`
                }
              />
              {products.length > 0 && (
                <div className="eloria-treasury-rail-wrap">
                  <p>
                    {fa
                      ? "گزیده‌ای از این گنجینه"
                      : "A glimpse of the treasury"}
                  </p>
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
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          fill
                          sizes="72px"
                          className="object-cover"
                        />
                      </TreasuryLink>
                    ))}
                    <TreasuryLink
                      href={collectionHref}
                      className="eloria-treasury-all"
                    >
                      <span>{fa ? "همه" : "All"}</span>
                      <span aria-hidden="true">↗</span>
                    </TreasuryLink>
                  </nav>
                </div>
              )}
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
    </div>
  );
}
