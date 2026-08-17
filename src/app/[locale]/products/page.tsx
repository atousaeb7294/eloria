import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { CatalogCategoryNavigation } from "@/components/catalog-category-navigation";
import { CatalogProductCard } from "@/components/catalog-product-card";
import { InternalPageShell } from "@/components/internal-page-shell";
import { AllProductsRuneIcon } from "@/components/material-rune-icons";
import { ProductCatalogFilters } from "@/components/product-catalog-filters";
import {
  getActiveCatalogCollections,
  type CatalogAvailability,
  type CatalogMaterial,
} from "@/lib/catalog";
import { getPricedProductsCatalog } from "@/lib/priced-catalog";

export const dynamic = "force-dynamic";

type ProductsPageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function positivePage(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) ? Math.max(1, parsed) : 1;
}

function pageHref(
  locale: string,
  raw: Record<string, string | string[] | undefined>,
  page: number,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (key === "page") continue;
    const item = single(value)?.trim();
    if (item) query.set(key, item);
  }
  if (page > 1) query.set("page", String(page));
  const encoded = query.toString();
  return `/${locale}/products${encoded ? `?${encoded}` : ""}`;
}

// ELORIA_FILTERED_CATALOG_SEO_V1
export async function generateMetadata({
  params,
  searchParams,
}: ProductsPageProps): Promise<Metadata> {
  const { locale } = await params;

  if (locale !== "fa" && locale !== "en") {
    return {};
  }

  const raw = await searchParams;
  const hasActiveQuery = Object.values(raw).some((value) =>
    Array.isArray(value)
      ? value.some((item) => item.trim().length > 0)
      : typeof value === "string" && value.trim().length > 0,
  );

  if (!hasActiveQuery) {
    return {};
  }

  return {
    robots: {
      index: false,
      follow: true,
    },
    alternates: {
      canonical: `/${locale}/products`,
      languages: {
        fa: "/fa/products",
        en: "/en/products",
        "x-default": "/fa/products",
      },
    },
  };
}

export default async function ProductsPage({ params, searchParams }: ProductsPageProps) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);

  const isPersian = locale === "fa";
  const raw = await searchParams;
  let catalogUnavailable = false;
  let collections: Awaited<ReturnType<typeof getActiveCatalogCollections>> = [];

  try {
    collections = await getActiveCatalogCollections();
  } catch (error) {
    catalogUnavailable = true;
    console.error("[Eloria Products] Collection navigation is unavailable.", error);
  }

  const collectionSlugs = new Set(collections.map(item => item.slug));

  const search = single(raw.q)?.trim() ?? "";
  const rawMaterial = single(raw.material);
  const rawCollection = single(raw.collection);
  const minPrice = single(raw.minPrice) ?? "";
  const maxPrice = single(raw.maxPrice) ?? "";
  const rawAvailability = single(raw.availability);
  const page = positivePage(single(raw.page));

  const availability: CatalogAvailability =
    rawAvailability === "available"
      ? "AVAILABLE"
      : rawAvailability === "out-of-stock"
        ? "OUT_OF_STOCK"
        : "ALL";

  const material: CatalogMaterial | undefined =
    rawMaterial === "gold" ? "GOLD" : rawMaterial === "silver" ? "SILVER" : undefined;
  const collectionSlug = rawCollection && collectionSlugs.has(rawCollection)
    ? rawCollection
    : undefined;

  let catalog = {
    products: [],
    total: 0,
    page: 1,
    pageSize: 24,
    pageCount: 1,
    priceFilterActive: Boolean(minPrice || maxPrice),
    pricingUnavailableCount: 0,
  } as Awaited<ReturnType<typeof getPricedProductsCatalog>>;

  if (!catalogUnavailable) {
    try {
      catalog = await getPricedProductsCatalog({
        search,
        material,
        collectionSlug,
        availability,
        minPriceToman: minPrice,
        maxPriceToman: maxPrice,
        page,
        pageSize: 24,
      });
    } catch (error) {
      catalogUnavailable = true;
      console.error("[Eloria Products] Catalog query is unavailable.", error);
    }
  }

  return (
    <InternalPageShell locale={locale}>
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

          <p className="text-xs uppercase tracking-[0.28em] text-[#cfb66f]/75">Eloria Archive</p>
          <h1 className={isPersian ? "font-persian-title mt-2 pb-3 text-3xl font-semibold leading-[1.9] text-[#f6e8c6] sm:text-4xl" : "mt-2 text-3xl font-semibold text-[#f6e8c6] sm:text-4xl"}>
            {isPersian ? "تمام آثار الوریا" : "All Eloria Creations"}
          </h1>
          <p className="mx-auto mt-1 max-w-2xl text-sm leading-8 text-[#cbbd9d]/75">
            {isPersian
              ? "تمام آثار موجود الوریا را ببینید و نتیجه را براساس گنجینه، جنس، موجودی و بازه قیمت دقیق‌تر کنید."
              : "Browse every Eloria creation and refine the results by collection, material, availability and price."}
          </p>
        </header>

        <CatalogCategoryNavigation
          locale={locale}
          activeCollection={collectionSlug}
          collections={collections}
        />

        <div className="mt-8">
          <ProductCatalogFilters
            key={`${search}:${rawMaterial ?? "all"}:${collectionSlug ?? "all"}:${minPrice}:${maxPrice}:${rawAvailability ?? "all"}`}
            locale={locale}
            initialFilters={{
              search,
              material: rawMaterial === "gold" || rawMaterial === "silver" ? rawMaterial : "all",
              collection: collectionSlug ?? "all",
              minPrice,
              maxPrice,
              availability:
                rawAvailability === "available" || rawAvailability === "out-of-stock"
                  ? rawAvailability
                  : "all",
            }}
          />
        </div>

        {catalogUnavailable && (
          <div role="status" className="mx-auto mt-8 max-w-3xl rounded-2xl border border-amber-200/20 bg-amber-100/[0.05] px-5 py-4 text-center text-sm leading-7 text-amber-50/80">
            {isPersian
              ? "ارتباط با فهرست آثار موقتاً برقرار نیست. صفحه را دوباره بارگذاری کنید؛ سایر بخش‌های سایت همچنان در دسترس‌اند."
              : "The live catalog is temporarily unavailable. Reload the page; the rest of the site remains accessible."}
          </div>
        )}

        {catalog.priceFilterActive && (
          <div className="mt-5 rounded-2xl border border-[#d9b85f]/18 bg-[#061f17]/55 px-4 py-3 text-xs leading-6 text-[#cdbd91]/75 backdrop-blur-xl">
            {isPersian
              ? "فیلتر قیمت با محاسبه دسته‌ای قیمت نهایی زنده انجام شده است."
              : "The price range uses batched live final-price calculation."}
          </div>
        )}

        <div className="mt-8 flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-[#041b14]/50 px-4 py-3 backdrop-blur-xl">
          <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border border-[#d9b85f]/20 bg-[#d9b85f]/[0.05] px-2 text-xs text-[#e5cb79]">
            {catalog.total.toLocaleString(isPersian ? "fa-IR" : "en-US")}
          </span>
          <p className="text-xs text-[#cbbd9d]/75">
            {isPersian
              ? `${catalog.total.toLocaleString("fa-IR")} اثر پیدا شد`
              : `${catalog.total.toLocaleString("en-US")} creations found`}
          </p>
          <span className="h-px flex-1 bg-gradient-to-r from-[#d1b25d]/24 to-transparent" />
        </div>

        {catalog.pricingUnavailableCount > 0 && (
          <p className="mt-3 text-xs text-amber-100/65">
            {isPersian
              ? `قیمت زنده ${catalog.pricingUnavailableCount.toLocaleString("fa-IR")} اثر در دسترس نبود.`
              : `Live pricing was unavailable for ${catalog.pricingUnavailableCount.toLocaleString("en-US")} creations.`}
          </p>
        )}

        {catalog.products.length === 0 ? (
          <div className="mx-auto mt-10 max-w-2xl rounded-[2rem] border border-[#d8b860]/20 bg-[#061b14]/75 px-6 py-16 text-center backdrop-blur-xl">
            <AllProductsRuneIcon className="mx-auto mb-5 h-10 w-10 text-[#d9b85f]" />
            <p className="text-base leading-8 text-[#eadfca]">
              {isPersian
                ? "اثری با این مشخصات پیدا نشد. فیلترها را تغییر دهید."
                : "No creation matches these filters. Adjust the filters and try again."}
            </p>
            <Link href={`/${locale}/products`} className="mx-auto mt-7 inline-flex min-h-11 items-center justify-center rounded-full border border-[#d9b85f]/35 bg-[#d9b85f]/[0.06] px-6 text-xs text-[#efd88e] transition hover:border-[#ecd17b]/65">
              {isPersian ? "نمایش تمام آثار" : "Show all creations"}
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 sm:gap-7 lg:grid-cols-3">
            {catalog.products.map((product, index) => (
              <CatalogProductCard
                key={product.id}
                product={product}
                locale={locale}
                eager={index < 2}
                showCollection
              />
            ))}
          </div>
        )}

        {catalog.pageCount > 1 && (
          <nav aria-label={isPersian ? "صفحه‌بندی آثار" : "Catalog pagination"} className="mt-12 flex items-center justify-center gap-3">
            {catalog.page === 1 ? (
              <span
                aria-disabled="true"
                className="min-h-11 rounded-full border border-white/10 px-5 py-3 text-xs text-white/25"
              >
                {isPersian ? "قبلی" : "Previous"}
              </span>
            ) : (
              <Link
                href={pageHref(locale, raw, catalog.page - 1)}
                className="min-h-11 rounded-full border border-[#d9b85f]/30 px-5 py-3 text-xs text-[#e9d596] transition hover:border-[#efd17d]/65"
              >
                {isPersian ? "قبلی" : "Previous"}
              </Link>
            )}
            <span className="min-w-24 text-center text-xs text-[#d9c89f]/75">
              {isPersian
                ? `صفحه ${catalog.page.toLocaleString("fa-IR")} از ${catalog.pageCount.toLocaleString("fa-IR")}`
                : `Page ${catalog.page} of ${catalog.pageCount}`}
            </span>
            {catalog.page === catalog.pageCount ? (
              <span
                aria-disabled="true"
                className="min-h-11 rounded-full border border-white/10 px-5 py-3 text-xs text-white/25"
              >
                {isPersian ? "بعدی" : "Next"}
              </span>
            ) : (
              <Link
                href={pageHref(locale, raw, catalog.page + 1)}
                className="min-h-11 rounded-full border border-[#d9b85f]/30 px-5 py-3 text-xs text-[#e9d596] transition hover:border-[#efd17d]/65"
              >
                {isPersian ? "بعدی" : "Next"}
              </Link>
            )}
          </nav>
        )}
      </section>
    </InternalPageShell>
  );
}
