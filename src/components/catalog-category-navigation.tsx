import Link from "next/link";

import {
  BraceletRuneIcon,
  EarringRuneIcon,
  NecklaceRuneIcon,
} from "@/components/luxury-icons";
import { AllProductsRuneIcon } from "@/components/material-rune-icons";
import type { CatalogCollectionOption } from "@/lib/catalog";

type CatalogCategoryNavigationProps = {
  locale: string;
  activeCollection?: string;
  collections: CatalogCollectionOption[];
};

function iconForCollection(slug: string) {
  if (slug === "necklaces") return NecklaceRuneIcon;
  if (slug === "bracelets") return BraceletRuneIcon;
  if (slug === "earrings") return EarringRuneIcon;
  return AllProductsRuneIcon;
}

export function CatalogCategoryNavigation({
  locale,
  activeCollection,
  collections,
}: CatalogCategoryNavigationProps) {
  const isPersian = locale === "fa";
  const selected = activeCollection ?? "all";
  const categories = [
    {
      slug: "all",
      label: isPersian ? "تمام آثار" : "All creations",
      productCount: collections.reduce((sum, item) => sum + item.productCount, 0),
      Icon: AllProductsRuneIcon,
    },
    ...collections.map(collection => ({
      slug: collection.slug,
      label: isPersian ? collection.nameFa : collection.nameEn,
      productCount: collection.productCount,
      Icon: iconForCollection(collection.slug),
    })),
  ];

  return (
    <nav
      aria-label={isPersian ? "دسته‌بندی آثار" : "Creation categories"}
      className="mx-auto mt-9 grid max-w-5xl grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
    >
      {categories.map(({ slug, label, productCount, Icon }) => {
        const active = selected === slug;
        const href =
          slug === "all"
            ? `/${locale}/products`
            : `/${locale}/products?collection=${encodeURIComponent(slug)}`;

        return (
          <Link
            key={slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-xs transition duration-300 sm:text-sm",
              active
                ? "border-[#e5c874]/55 bg-[#d9b85f]/[0.11] text-[#f4df9f] shadow-[0_12px_35px_rgba(0,0,0,0.24),0_0_20px_rgba(217,184,95,0.07)]"
                : "border-white/[0.08] bg-[#041b14]/55 text-[#cbbd9d]/75 hover:border-[#d9b85f]/32 hover:text-[#ead8aa]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition",
                active
                  ? "border-[#e2c46f]/35 bg-[#d9b85f]/[0.09] text-[#e7ca77]"
                  : "border-white/[0.08] bg-white/[0.025] text-[#bda96f]/70 group-hover:border-[#d9b85f]/25 group-hover:text-[#dfc477]",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>

            <span className="min-w-0 truncate">{label}</span>
            <span className="text-[10px] text-white/45">
              {productCount.toLocaleString(isPersian ? "fa-IR" : "en-US")}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
