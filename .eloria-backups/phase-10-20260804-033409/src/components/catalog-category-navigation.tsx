import Link from "next/link";

import {
  BraceletRuneIcon,
  EarringRuneIcon,
  NecklaceRuneIcon,
} from "@/components/luxury-icons";

import {
  AllProductsRuneIcon,
} from "@/components/material-rune-icons";

type CatalogCategoryNavigationProps = {
  locale: string;
  activeCollection?: string;
};

const categories = [
  {
    slug: "all",
    fa: "تمام آثار",
    en: "All creations",
    Icon: AllProductsRuneIcon,
  },
  {
    slug: "necklaces",
    fa: "گردنبند",
    en: "Necklaces",
    Icon: NecklaceRuneIcon,
  },
  {
    slug: "bracelets",
    fa: "دستبند",
    en: "Bracelets",
    Icon: BraceletRuneIcon,
  },
  {
    slug: "earrings",
    fa: "گوشواره",
    en: "Earrings",
    Icon: EarringRuneIcon,
  },
] as const;

export function CatalogCategoryNavigation({
  locale,
  activeCollection,
}: CatalogCategoryNavigationProps) {
  const isPersian = locale === "fa";
  const selected = activeCollection ?? "all";

  return (
    <nav
      aria-label={isPersian ? "دسته‌بندی آثار" : "Creation categories"}
      className="mx-auto mt-9 grid max-w-4xl grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {categories.map(({ slug, fa, en, Icon }) => {
        const active = selected === slug;
        const href =
          slug === "all"
            ? `/${locale}/products`
            : `/${locale}/products?collection=${slug}`;

        return (
          <Link
            key={slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={[
              "group flex min-h-14 items-center justify-center gap-2 rounded-2xl border px-3 text-xs transition duration-300 sm:text-sm",
              active
                ? "border-[#e5c874]/55 bg-[#d9b85f]/[0.11] text-[#f4df9f] shadow-[0_12px_35px_rgba(0,0,0,0.24),0_0_20px_rgba(217,184,95,0.07)]"
                : "border-white/[0.08] bg-[#041b14]/55 text-[#cbbd9d]/70 hover:border-[#d9b85f]/32 hover:text-[#ead8aa]",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border transition",
                active
                  ? "border-[#e2c46f]/35 bg-[#d9b85f]/[0.09] text-[#e7ca77]"
                  : "border-white/[0.08] bg-white/[0.025] text-[#bda96f]/65 group-hover:border-[#d9b85f]/25 group-hover:text-[#dfc477]",
              ].join(" ")}
            >
              <Icon className="h-[18px] w-[18px]" />
            </span>

            <span>{isPersian ? fa : en}</span>
          </Link>
        );
      })}
    </nav>
  );
}
