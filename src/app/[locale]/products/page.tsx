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
  AllProductsRuneIcon,
} from "@/components/material-rune-icons";

import {
  ProductCatalogFilters,
} from "@/components/product-catalog-filters";

import type {
  CatalogMaterial,
} from "@/lib/catalog";

import {
  getPricedProductsCatalog,
} from "@/lib/priced-catalog";

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

type ProductsPageProps = {
  params: Promise<{
    locale: string;
  }>;

  searchParams: Promise<{
    q?:
      | string
      | string[];

    material?:
      | string
      | string[];

    collection?:
      | string
      | string[];

    minPrice?:
      | string
      | string[];

    maxPrice?:
      | string
      | string[];
  }>;
};

function getSingleValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  return Array.isArray(
    value,
  )
    ? value[0]
    : value;
}

export default async function ProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const {
    locale,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  setRequestLocale(
    locale,
  );

  const isPersian =
    locale === "fa";

  const raw =
    await searchParams;

  const search =
    getSingleValue(
      raw.q,
    )?.trim() ?? "";

  const rawMaterial =
    getSingleValue(
      raw.material,
    );

  const rawCollection =
    getSingleValue(
      raw.collection,
    );

  const minPrice =
    getSingleValue(
      raw.minPrice,
    ) ?? "";

  const maxPrice =
    getSingleValue(
      raw.maxPrice,
    ) ?? "";

  let material:
    | CatalogMaterial
    | undefined;

  if (
    rawMaterial === "gold"
  ) {
    material = "GOLD";
  }

  if (
    rawMaterial === "silver"
  ) {
    material = "SILVER";
  }

  const allowedCollections = [
    "necklaces",
    "bracelets",
    "earrings",
  ];

  const collectionSlug =
    rawCollection &&
    allowedCollections.includes(
      rawCollection,
    )
      ? rawCollection
      : undefined;

  const catalog =
    await getPricedProductsCatalog({
      search,
      material,
      collectionSlug,

      minPriceToman:
        minPrice,

      maxPriceToman:
        maxPrice,
    });

  return (
    <InternalPageShell
      locale={locale}
    >
      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-28 pt-36 sm:px-6 lg:px-10 lg:pt-40">
        <header className="mx-auto max-w-4xl text-center">
          <div className="mb-4 flex items-center justify-center gap-4">
            <span className="h-px w-14 bg-gradient-to-r from-transparent to-[#d3b35b]/70 sm:w-24" />

            <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#d9ba63]/35 bg-[radial-gradient(circle,rgba(211,176,85,0.14),rgba(4,29,21,0.88)_70%)]">
              <span className="absolute inset-[5px] rounded-full border border-dashed border-[#e0c26d]/20" />

              <AllProductsRuneIcon className="relative h-8 w-8 text-[#e7ca77]" />
            </div>

            <span className="h-px w-14 bg-gradient-to-l from-transparent to-[#d3b35b]/70 sm:w-24" />
          </div>

          <p className="text-[9px] uppercase tracking-[0.45em] text-[#cfb66f]/60">
            Eloria Products
          </p>

          <h1
            className={[
              "mt-2 text-[#f6e8c6]",

              isPersian
                ? `${persianTitleFont.className} pb-3 text-3xl font-semibold leading-[1.9] sm:text-4xl`
                : "text-3xl font-semibold sm:text-4xl",
            ].join(" ")}
          >
            {isPersian
              ? "تمام محصولات الــوریا"
              : "All Eloria Products"}
          </h1>

          <p className="mx-auto mt-1 max-w-2xl text-sm leading-8 text-[#cbbd9d]/65">
            {isPersian
              ? "میان محصولات طلا و نقره جست‌وجو کنید، دسته‌بندی را انتخاب کنید و بازه قیمت نهایی را تعیین کنید."
              : "Search gold and silver pieces, choose a category and set the final price range."}
          </p>
        </header>

        <div className="mt-10">
          <ProductCatalogFilters
            locale={locale}
            initialFilters={{
              search,

              material:
                rawMaterial ===
                  "gold" ||
                rawMaterial ===
                  "silver"
                  ? rawMaterial
                  : "all",

              collection:
                collectionSlug ===
                  "necklaces" ||
                collectionSlug ===
                  "bracelets" ||
                collectionSlug ===
                  "earrings"
                  ? collectionSlug
                  : "all",

              minPrice,
              maxPrice,
            }}
          />
        </div>

        {catalog.priceFilterActive && (
          <div className="mt-5 rounded-2xl border border-[#d9b85f]/18 bg-[#061f17]/55 px-4 py-3 text-[10px] leading-6 text-[#cdbd91]/65 backdrop-blur-xl">
            {isPersian
              ? "فیلتر قیمت با قیمت نهایی زنده انجام شده است؛ طلا با سیاست طلا و نقره با سیاست مستقل نقره محاسبه شده است."
              : "The price range uses live final prices; gold and silver each use their dedicated pricing policy."}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-xs text-[#cbbd9d]/65">
            {isPersian
              ? `${catalog.total.toLocaleString(
                  "fa-IR",
                )} محصول پیدا شد`
              : `${catalog.total.toLocaleString(
                  "en-US",
                )} products found`}
          </p>

          <span className="h-px flex-1 bg-gradient-to-r from-[#d1b25d]/20 to-transparent" />
        </div>

        {catalog.pricingUnavailableCount >
          0 && (
          <p className="mt-3 text-[10px] text-amber-100/45">
            {isPersian
              ? `قیمت زنده ${catalog.pricingUnavailableCount.toLocaleString(
                  "fa-IR",
                )} محصول در این لحظه در دسترس نبود.`
              : `Live pricing was unavailable for ${catalog.pricingUnavailableCount.toLocaleString(
                  "en-US",
                )} products.`}
          </p>
        )}

        {catalog.products.length ===
        0 ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-[#d8b860]/20 bg-[#061b14]/75 px-6 py-16 text-center backdrop-blur-xl">
            <AllProductsRuneIcon className="mx-auto mb-5 h-10 w-10 text-[#d9b85f]" />

            <p className="text-base leading-8 text-[#eadfca]">
              {isPersian
                ? "محصولی با این مشخصات پیدا نشد. فیلترها را تغییر بده."
                : "No products match these filters."}
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
                  showCollection
                />
              ),
            )}
          </div>
        )}
      </section>
    </InternalPageShell>
  );
}