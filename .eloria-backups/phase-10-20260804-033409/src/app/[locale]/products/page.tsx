import Link from "next/link";

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
  CatalogCategoryNavigation,
} from "@/components/catalog-category-navigation";

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
  CatalogAvailability,
  CatalogMaterial,
} from "@/lib/catalog";

import {
  getPricedProductsCatalog,
} from "@/lib/priced-catalog";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

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

    availability?:
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

  const rawAvailability =
    getSingleValue(
      raw.availability,
    );

  const availability: CatalogAvailability =
    rawAvailability === "available"
      ? "AVAILABLE"
      : rawAvailability === "out-of-stock"
        ? "OUT_OF_STOCK"
        : "ALL";

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
      availability,

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

          <p className="text-[11px] uppercase tracking-[0.34em] text-[#cfb66f]/70">
            Eloria Archive
          </p>

          <h1
            className={[
              "mt-2 text-[#f6e8c6]",

              isPersian
                ? `font-persian-title pb-3 text-3xl font-semibold leading-[1.9] sm:text-4xl`
                : "text-3xl font-semibold sm:text-4xl",
            ].join(" ")}
          >
            {isPersian
              ? "تمام آثار الوریا"
              : "All Eloria Creations"}
          </h1>

          <p className="mx-auto mt-1 max-w-2xl text-sm leading-8 text-[#cbbd9d]/65">
            {isPersian
              ? "تمام آثار موجود الوریا را در یک مسیر یکپارچه ببینید و نتیجه را براساس دسته‌بندی، جنس، موجودی و بازه قیمت دقیق‌تر کنید."
              : "Browse every available Eloria creation in one place, then refine the results by category, material, availability and price."}
          </p>
        </header>

        <CatalogCategoryNavigation
          locale={locale}
          activeCollection={collectionSlug}
        />

        <div className="mt-8">
          <ProductCatalogFilters
            key={`${search}:${rawMaterial ?? "all"}:${collectionSlug ?? "all"}:${minPrice}:${maxPrice}:${rawAvailability ?? "all"}`}
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

              availability:
                rawAvailability === "available" ||
                rawAvailability === "out-of-stock"
                  ? rawAvailability
                  : "all",
            }}
          />
        </div>

        {catalog.priceFilterActive && (
          <div className="mt-5 rounded-2xl border border-[#d9b85f]/18 bg-[#061f17]/55 px-4 py-3 text-[11px] leading-6 text-[#cdbd91]/70 backdrop-blur-xl">
            {isPersian
              ? "فیلتر قیمت با قیمت نهایی زنده انجام شده است؛ طلا با سیاست طلا و نقره با سیاست مستقل نقره محاسبه شده است."
              : "The price range uses live final prices; gold and silver each use their dedicated pricing policy."}
          </div>
        )}

        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#041b14]/50 px-4 py-3 backdrop-blur-xl">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#d9b85f]/20 bg-[#d9b85f]/[0.05] text-[11px] text-[#e5cb79]">
            {catalog.total.toLocaleString(
              isPersian
                ? "fa-IR"
                : "en-US",
            )}
          </span>

          <p className="text-xs text-[#cbbd9d]/72">
            {isPersian
              ? `${catalog.total.toLocaleString(
                  "fa-IR",
                )} اثر پیدا شد`
              : `${catalog.total.toLocaleString(
                  "en-US",
                )} creations found`}
          </p>

          <span className="h-px flex-1 bg-gradient-to-r from-[#d1b25d]/24 to-transparent" />
        </div>

        {catalog.pricingUnavailableCount >
          0 && (
          <p className="mt-3 text-[10px] text-amber-100/45">
            {isPersian
              ? `قیمت زنده ${catalog.pricingUnavailableCount.toLocaleString(
                  "fa-IR",
                )} اثر در این لحظه در دسترس نبود.`
              : `Live pricing was unavailable for ${catalog.pricingUnavailableCount.toLocaleString(
                  "en-US",
                )} creations.`}
          </p>
        )}

        {catalog.products.length ===
        0 ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-[#d8b860]/20 bg-[#061b14]/75 px-6 py-16 text-center backdrop-blur-xl">
            <AllProductsRuneIcon className="mx-auto mb-5 h-10 w-10 text-[#d9b85f]" />

            <p className="text-base leading-8 text-[#eadfca]">
              {isPersian
                ? "اثری با این مشخصات پیدا نشد. فیلترها را تغییر دهید یا تمام آثار را دوباره نمایش دهید."
                : "No creation matches these filters. Adjust them or display all creations again."}
            </p>

            <Link
              href={`/${locale}/products`}
              className="mx-auto mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-[#d9b85f]/35 bg-[#d9b85f]/[0.06] px-6 text-xs text-[#efd88e] transition hover:border-[#ecd17b]/65 hover:bg-[#d9b85f]/[0.1]"
            >
              {isPersian
                ? "نمایش تمام آثار"
                : "Show all creations"}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
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