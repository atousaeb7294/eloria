import Link from "next/link";

import {
  Noto_Nastaliq_Urdu,
} from "next/font/google";

import {
  notFound,
} from "next/navigation";

import {
  setRequestLocale,
} from "next-intl/server";

import {
  CatalogProductCard,
} from "@/components/catalog-product-card";

import {
  InternalPageShell,
} from "@/components/internal-page-shell";

import {
  BraceletRuneIcon,
  EarringRuneIcon,
  NecklaceRuneIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";

import {
  GoldRuneIcon,
  SilverRuneIcon,
} from "@/components/material-rune-icons";

import {
  CatalogError,
  type CatalogMaterial,
  getCollectionCatalog,
} from "@/lib/catalog";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

const persianTitleFont =
  Noto_Nastaliq_Urdu({
    subsets: [
      "arabic",
    ],

    weight: [
      "400",
      "500",
      "600",
      "700",
    ],

    display:
      "swap",
  });

type MaterialCollectionPageProps = {
  params: Promise<{
    locale: string;
    collection: string;
    material: string;
  }>;
};

type CollectionSlug =
  | "necklaces"
  | "bracelets"
  | "earrings";

type MaterialSlug =
  | "gold"
  | "silver";

const collectionNames = {
  necklaces: {
    fa: "گردنبندهای",
    en: "Necklace",
  },

  bracelets: {
    fa: "دستبندهای",
    en: "Bracelet",
  },

  earrings: {
    fa: "گوشواره‌های",
    en: "Earring",
  },
} as const;

function isCollectionSlug(
  value: string,
): value is CollectionSlug {
  return (
    value === "necklaces" ||
    value === "bracelets" ||
    value === "earrings"
  );
}

function isMaterialSlug(
  value: string,
): value is MaterialSlug {
  return (
    value === "gold" ||
    value === "silver"
  );
}

function CollectionRune({
  collection,
  className,
}: {
  collection: CollectionSlug;
  className?: string;
}) {
  if (
    collection ===
    "bracelets"
  ) {
    return (
      <BraceletRuneIcon
        className={className}
      />
    );
  }

  if (
    collection ===
    "earrings"
  ) {
    return (
      <EarringRuneIcon
        className={className}
      />
    );
  }

  return (
    <NecklaceRuneIcon
      className={className}
    />
  );
}

export default async function MaterialCollectionPage({
  params,
}: MaterialCollectionPageProps) {
  const {
    locale,
    collection,
    material,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  if (
    !isCollectionSlug(
      collection,
    ) ||
    !isMaterialSlug(
      material,
    )
  ) {
    notFound();
  }

  setRequestLocale(
    locale,
  );

  const isPersian =
    locale === "fa";

  const isGold =
    material === "gold";

  const materialType:
    CatalogMaterial =
    isGold
      ? "GOLD"
      : "SILVER";

  let catalog;

  try {
    catalog =
      await getCollectionCatalog(
        collection,
        materialType,
      );
  } catch (error) {
    if (
      error instanceof
        CatalogError &&
      error.code ===
        "COLLECTION_NOT_FOUND"
    ) {
      notFound();
    }

    throw error;
  }

  const collectionName =
    collectionNames[
      collection
    ][
      isPersian
        ? "fa"
        : "en"
    ];

  const pageTitle =
    isPersian
      ? `گنجینه ${collectionName} ${
          isGold
            ? "طلا"
            : "نقره"
        }`
      : `${
          isGold
            ? "Gold"
            : "Silver"
        } ${collectionName} Collection`;

  const MaterialIcon =
    isGold
      ? GoldRuneIcon
      : SilverRuneIcon;

  return (
    <InternalPageShell
      locale={locale}
    >
      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-28 pt-[126px] sm:px-6 sm:pt-[136px] lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/${locale}/collections`}
            className="group flex items-center gap-3 rounded-full border border-[#d9b85f]/32 bg-[#061f17]/80 py-1.5 pe-4 ps-1.5 text-[11px] text-[#e5d19a] transition hover:-translate-y-0.5 hover:border-[#efd17d]/65"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9b85f]/25">
              <WorldRuneIcon className="h-5 w-5" />
            </span>

            <span>
              {isPersian
                ? "بازگشت به گنجینه‌ها"
                : "Back to collections"}
            </span>
          </Link>

          <Link
            href={`/${locale}/products?material=${material}&collection=${collection}`}
            className="rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[10px] text-[#cab985]/60 transition hover:border-[#d9b85f]/25 hover:text-[#ead699]"
          >
            {isPersian
              ? "جست‌وجو در تمام محصولات این بخش"
              : "Search all products in this section"}
          </Link>
        </div>

        <header className="mx-auto mt-3 max-w-3xl text-center">
          <div className="mb-2 flex items-center justify-center gap-3">
            <CollectionRune
              collection={
                collection
              }
              className="h-6 w-6 text-[#d8bd70]"
            />

            <span className="h-px w-12 bg-gradient-to-r from-[#d3b35b]/55 to-transparent" />

            <MaterialIcon
              className={[
                "h-8 w-8",
                isGold
                  ? "text-[#e6c66f]"
                  : "text-[#dbe6e9]",
              ].join(" ")}
            />

            <span className="h-px w-12 bg-gradient-to-l from-[#d3b35b]/55 to-transparent" />

            <CollectionRune
              collection={
                collection
              }
              className="h-6 w-6 text-[#d8bd70]"
            />
          </div>

          <p className="mb-4 text-[7px] uppercase leading-none tracking-[0.42em] text-[#cfb66f]/55">
            {isGold
              ? "Eloria Gold Collection"
              : "Eloria Silver Collection"}
          </p>

          <h1
            className={[
              isPersian
                ? `${persianTitleFont.className} block pt-1 text-[1.45rem] font-semibold leading-[2.1] sm:text-[1.7rem]`
                : "block text-2xl font-semibold sm:text-3xl",
              isGold
                ? "text-[#f4dfa0]"
                : "text-[#e4edef]",
            ].join(" ")}
          >
            {pageTitle}
          </h1>

          <p className="mx-auto mt-2 max-w-xl text-[10px] leading-6 text-[#cbbd9d]/62 sm:text-xs">
            {isGold
              ? isPersian
                ? "قیمت آثار این بخش در صفحه محصول با نرخ معتبر طلا و سیاست اختصاصی قیمت‌گذاری الــوریا محاسبه می‌شود."
                : "Products use the current gold rate and Eloria’s dedicated gold pricing policy."
              : isPersian
                ? "قیمت آثار این بخش در صفحه محصول با نرخ معتبر نقره و سیاست اختصاصی قیمت‌گذاری الــوریا محاسبه می‌شود."
                : "Products use the current silver rate and Eloria’s dedicated silver pricing policy."}
          </p>
        </header>

        <nav className="mx-auto mt-7 grid max-w-xl grid-cols-2 gap-3">
          <Link
            href={`/${locale}/collections/${collection}/gold`}
            className={[
              "flex min-h-12 items-center justify-center gap-2 rounded-full border px-4 text-xs transition",
              isGold
                ? "border-[#efd17a]/68 bg-[#d4b258]/13 text-[#f4df9e] shadow-[0_0_24px_rgba(218,184,95,0.11)]"
                : "border-[#d9b85f]/20 bg-white/[0.025] text-white/45 hover:border-[#d9b85f]/38 hover:text-[#e9d294]",
            ].join(" ")}
          >
            <GoldRuneIcon className="h-5 w-5" />

            <span>
              {isPersian
                ? "گنجینه طلا"
                : "Gold"}
            </span>
          </Link>

          <Link
            href={`/${locale}/collections/${collection}/silver`}
            className={[
              "flex min-h-12 items-center justify-center gap-2 rounded-full border px-4 text-xs transition",
              !isGold
                ? "border-[#dde7ea]/50 bg-[#dce6e9]/[0.08] text-[#e7eef0] shadow-[0_0_24px_rgba(220,231,234,0.08)]"
                : "border-[#d7e1e4]/16 bg-white/[0.025] text-white/45 hover:border-[#d7e1e4]/32 hover:text-[#dfe8ea]",
            ].join(" ")}
          >
            <SilverRuneIcon className="h-5 w-5" />

            <span>
              {isPersian
                ? "گنجینه نقره"
                : "Silver"}
            </span>
          </Link>
        </nav>

        {catalog.products.length ===
        0 ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-[#d8b860]/18 bg-[#061b14]/75 px-6 py-16 text-center backdrop-blur-xl">
            <MaterialIcon
              className={[
                "mx-auto mb-5 h-10 w-10",
                isGold
                  ? "text-[#d9b85f]"
                  : "text-[#dbe6e9]",
              ].join(" ")}
            />

            <p className="text-base leading-8 text-[#eadfca]">
              {isPersian
                ? `هنوز محصول ${
                    isGold
                      ? "طلایی"
                      : "نقره‌ای"
                  } در این گنجینه ثبت نشده است.`
                : `No ${
                    isGold
                      ? "gold"
                      : "silver"
                  } products have been added yet.`}
            </p>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {catalog.products.map(
              (
                product,
                index,
              ) => (
                <CatalogProductCard
                  key={
                    product.id
                  }
                  product={
                    product
                  }
                  locale={
                    locale
                  }
                  eager={
                    index === 0
                  }
                  showCollection={
                    false
                  }
                />
              ),
            )}
          </div>
        )}
      </section>
    </InternalPageShell>
  );
}