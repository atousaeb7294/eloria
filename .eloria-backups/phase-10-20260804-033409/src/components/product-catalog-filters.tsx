"use client";

import {
  usePathname,
  useRouter,
} from "next/navigation";

import {
  type FormEvent,
  useState,
  useTransition,
} from "react";

import {
  CheckCircle2,
  ChevronDown,
  CircleOff,
  SlidersHorizontal,
} from "lucide-react";

import {
  AllProductsRuneIcon,
  FilterRuneIcon,
  GoldRuneIcon,
  SearchRuneIcon,
  SilverRuneIcon,
} from "@/components/material-rune-icons";

type MaterialFilter =
  | "all"
  | "gold"
  | "silver";

type CollectionFilter =
  | "all"
  | "necklaces"
  | "bracelets"
  | "earrings";

type AvailabilityFilter =
  | "all"
  | "available"
  | "out-of-stock";

type ProductCatalogFiltersProps = {
  locale: string;

  initialFilters: {
    search: string;
    material: MaterialFilter;
    collection: CollectionFilter;
    minPrice: string;
    maxPrice: string;
    availability: AvailabilityFilter;
  };
};

function normalizeNumericInput(
  value: string,
): string {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  const arabicDigits =
    "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          persianDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        String(
          arabicDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(/[^\d]/g, "")
    .slice(0, 15);
}

export function ProductCatalogFilters({
  locale,
  initialFilters,
}: ProductCatalogFiltersProps) {
  const router =
    useRouter();

  const pathname =
    usePathname();

  const isPersian =
    locale === "fa";

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    search,
    setSearch,
  ] = useState(
    initialFilters.search,
  );

  const [
    material,
    setMaterial,
  ] =
    useState<MaterialFilter>(
      initialFilters.material,
    );

  const [
    collection,
    setCollection,
  ] =
    useState<CollectionFilter>(
      initialFilters.collection,
    );

  const [
    minPrice,
    setMinPrice,
  ] = useState(
    normalizeNumericInput(initialFilters.minPrice),
  );

  const [
    maxPrice,
    setMaxPrice,
  ] = useState(
    normalizeNumericInput(initialFilters.maxPrice),
  );

  const [
    availability,
    setAvailability,
  ] = useState<AvailabilityFilter>(
    initialFilters.availability,
  );

  const submitFilters = (
    event?: FormEvent,
  ) => {
    event?.preventDefault();

    if (invalidPriceRange) {
      setFiltersOpen(true);
      return;
    }

    const params =
      new URLSearchParams();

    const normalizedSearch =
      search.trim();

    if (normalizedSearch) {
      params.set(
        "q",
        normalizedSearch,
      );
    }

    if (
      material !== "all"
    ) {
      params.set(
        "material",
        material,
      );
    }

    if (
      collection !== "all"
    ) {
      params.set(
        "collection",
        collection,
      );
    }

    if (minPrice) {
      params.set(
        "minPrice",
        minPrice,
      );
    }

    if (maxPrice) {
      params.set(
        "maxPrice",
        maxPrice,
      );
    }

    if (availability !== "all") {
      params.set(
        "availability",
        availability,
      );
    }

    const query =
      params.toString();

    setFiltersOpen(false);

    startTransition(() => {
      router.push(
        query
          ? `${pathname}?${query}`
          : pathname,
        {
          scroll: false,
        },
      );
    });
  };

  const resetFilters = () => {
    setSearch("");
    setMaterial("all");
    setCollection("all");
    setMinPrice("");
    setMaxPrice("");
    setAvailability("all");
    setFiltersOpen(false);

    startTransition(() => {
      router.push(
        pathname,
        {
          scroll: false,
        },
      );
    });
  };

  const activeFilterCount =
    Number(
      material !== "all",
    ) +
    Number(
      collection !== "all",
    ) +
    Number(Boolean(minPrice)) +
    Number(Boolean(maxPrice)) +
    Number(
      availability !== "all",
    );

  const invalidPriceRange =
    Boolean(
      minPrice &&
      maxPrice &&
      /^\d+$/.test(minPrice) &&
      /^\d+$/.test(maxPrice) &&
      BigInt(minPrice) > BigInt(maxPrice),
    );

  const materialChoices = [
    {
      value: "all",
      label:
        isPersian
          ? "همه"
          : "All",

      Icon:
        AllProductsRuneIcon,
    },

    {
      value: "gold",
      label:
        isPersian
          ? "طلا"
          : "Gold",

      Icon:
        GoldRuneIcon,
    },

    {
      value: "silver",
      label:
        isPersian
          ? "نقره"
          : "Silver",

      Icon:
        SilverRuneIcon,
    },
  ] as const;

  const availabilityChoices = [
    {
      value: "all",
      label: isPersian ? "همه" : "All",
      Icon: AllProductsRuneIcon,
    },
    {
      value: "available",
      label: isPersian ? "موجود" : "Available",
      Icon: CheckCircle2,
    },
    {
      value: "out-of-stock",
      label: isPersian ? "ناموجود" : "Out of stock",
      Icon: CircleOff,
    },
  ] as const;

  return (
    <form
      onSubmit={
        submitFilters
      }
      className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.8rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(7,38,28,0.92),rgba(2,21,15,0.96))] p-4 shadow-[0_20px_55px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-5"
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#edd27e]/60 to-transparent"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute -start-24 -top-24 h-44 w-44 rounded-full bg-[#d9b85f]/[0.035] blur-3xl"
      />

      <div className="relative grid gap-4">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d9b85f]/25 bg-[#d9b85f]/[0.055] text-[#dec16d]">
              <FilterRuneIcon className="h-[18px] w-[18px]" />
            </span>

            <div className="min-w-0">
              <h2 className="text-sm font-medium text-[#eee1ca]">
                {isPersian
                  ? "جست‌وجو و فیلتر"
                  : "Search and filters"}
              </h2>

              <p className="mt-1 hidden text-[11px] text-white/45 sm:block">
                {isPersian
                  ? "آثار را براساس جنس، دسته‌بندی، موجودی و قیمت محدود کنید."
                  : "Refine creations by material, category, availability and price."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              setFiltersOpen(
                (current) =>
                  !current,
              )
            }
            aria-expanded={filtersOpen}
            aria-controls="catalog-material-filters catalog-availability-filters catalog-price-filters"
            className="flex min-h-10 shrink-0 items-center gap-2 rounded-full border border-[#d9b85f]/25 bg-[#d9b85f]/[0.055] px-3 text-[11px] text-[#e7d397] transition hover:border-[#e5ca77]/50 lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" />

            <span>
              {isPersian
                ? "فیلترها"
                : "Filters"}
            </span>

            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#d9b85f]/20 px-1 text-[10px] text-[#f3df9f]">
                {activeFilterCount.toLocaleString(
                  isPersian
                    ? "fa-IR"
                    : "en-US",
                )}
              </span>
            )}

            <ChevronDown
              className={[
                "h-3.5 w-3.5 transition-transform",
                filtersOpen
                  ? "rotate-180"
                  : "",
              ].join(" ")}
            />
          </button>
        </div>

        {/* جست‌وجو */}
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr]">
          <div>
            <label
              htmlFor="product-search"
              className="mb-1.5 block text-xs text-[#d8c79a]/80"
            >
              {isPersian
                ? "جست‌وجوی آثار"
                : "Search creations"}
            </label>

            <div className="relative">
              <span className="absolute start-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#d9be72]">
                <SearchRuneIcon className="h-[18px] w-[18px]" />
              </span>

              <input
                id="product-search"
                type="search"
                value={search}
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder={
                  isPersian
                    ? "نام اثر یا کد محصول..."
                    : "Creation name or SKU..."
                }
                className="h-12 w-full rounded-xl border border-[#d9b85f]/22 bg-[#031d15]/90 pe-12 ps-11 text-sm text-[#f2e8d5] outline-none placeholder:text-[#a99f89]/40 transition focus:border-[#e4c873]/55 focus:shadow-[0_0_18px_rgba(218,184,95,0.08)]"
              />

              <button
                type="submit"
                disabled={
                  isPending ||
                  invalidPriceRange
                }
                aria-label={
                  isPersian
                    ? "جست‌وجوی آثار"
                    : "Search creations"
                }
                className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[#d9b85f]/20 bg-[#d9b85f]/[0.06] text-[#e2c874] transition hover:border-[#e8cf7c]/50 disabled:opacity-40"
              >
                <SearchRuneIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* جنس اثر */}
          <div
            id="catalog-material-filters"
            className={[
              filtersOpen
                ? "block"
                : "hidden",
              "lg:block",
            ].join(" ")}
          >
            <span className="mb-1.5 block text-xs text-[#d8c79a]/80">
              {isPersian
                ? "جنس اثر"
                : "Material"}
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              {materialChoices.map(
                ({
                  value,
                  label,
                  Icon,
                }) => {
                  const active =
                    material ===
                    value;

                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() =>
                        setMaterial(
                          value,
                        )
                      }
                      className={[
                        "group flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-xs transition duration-300",
                        active
                          ? value ===
                            "silver"
                            ? "border-[#d9e2e5]/45 bg-[#d9e2e5]/10 text-[#eef4f5] shadow-[0_0_14px_rgba(220,231,234,0.07)]"
                            : "border-[#e4c873]/48 bg-[#d7b65c]/10 text-[#f4df9e] shadow-[0_0_14px_rgba(218,184,95,0.08)]"
                          : "border-white/[0.07] bg-white/[0.025] text-white/50 hover:border-[#d9b85f]/28 hover:text-[#e5d5ad]",
                      ].join(
                        " ",
                      )}
                    >
                      <Icon className="h-[17px] w-[17px]" />

                      <span>
                        {label}
                      </span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* وضعیت موجودی */}
          <div
            id="catalog-availability-filters"
            className={[
              filtersOpen ? "block" : "hidden",
              "lg:block",
            ].join(" ")}
          >
            <span className="mb-1.5 block text-xs text-[#d8c79a]/80">
              {isPersian ? "وضعیت موجودی" : "Availability"}
            </span>

            <div className="grid grid-cols-3 gap-1.5">
              {availabilityChoices.map(({ value, label, Icon }) => {
                const active = availability === value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setAvailability(value)}
                    className={[
                      "flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[11px] transition duration-300",
                      active
                        ? "border-[#e4c873]/48 bg-[#d7b65c]/10 text-[#f4df9e] shadow-[0_0_14px_rgba(218,184,95,0.08)]"
                        : "border-white/[0.07] bg-white/[0.025] text-white/50 hover:border-[#d9b85f]/28 hover:text-[#e5d5ad]",
                    ].join(" ")}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* بازه قیمت */}
        <div
          id="catalog-price-filters"
          className={[
            "items-end gap-3 lg:grid-cols-[1fr_1fr_auto]",
            filtersOpen
              ? "grid"
              : "hidden",
            "lg:grid",
          ].join(" ")}
        >
          <label className="relative">
            <span className="mb-1.5 block text-xs text-[#d8c79a]/80">
              {isPersian
                ? "حداقل قیمت"
                : "Minimum price"}
            </span>

            <input
              type="text"
              inputMode="numeric"
              value={minPrice}
              onChange={(
                event,
              ) =>
                setMinPrice(
                  normalizeNumericInput(
                    event.target
                      .value,
                  ),
                )
              }
              placeholder={
                isPersian
                  ? "مثلاً 10000000"
                  : "e.g. 10000000"
              }
              className="h-10 w-full rounded-xl border border-[#d9b85f]/20 bg-[#031d15]/90 pe-14 ps-3 text-xs text-[#e8ddc7] outline-none placeholder:text-white/25 transition focus:border-[#e4c873]/50"
            />

            <span className="pointer-events-none absolute bottom-[11px] end-3 text-[10px] text-[#d4bd7a]/58">
              {isPersian
                ? "تومان"
                : "Toman"}
            </span>
          </label>

          <label className="relative">
            <span className="mb-1.5 block text-xs text-[#d8c79a]/80">
              {isPersian
                ? "حداکثر قیمت"
                : "Maximum price"}
            </span>

            <input
              type="text"
              inputMode="numeric"
              value={maxPrice}
              onChange={(
                event,
              ) =>
                setMaxPrice(
                  normalizeNumericInput(
                    event.target
                      .value,
                  ),
                )
              }
              placeholder={
                isPersian
                  ? "مثلاً 100000000"
                  : "e.g. 100000000"
              }
              className="h-10 w-full rounded-xl border border-[#d9b85f]/20 bg-[#031d15]/90 pe-14 ps-3 text-xs text-[#e8ddc7] outline-none placeholder:text-white/25 transition focus:border-[#e4c873]/50"
            />

            <span className="pointer-events-none absolute bottom-[11px] end-3 text-[10px] text-[#d4bd7a]/58">
              {isPersian
                ? "تومان"
                : "Toman"}
            </span>
          </label>

          {/* دکمه‌ها */}
          <div className="grid grid-cols-2 gap-2 lg:flex">
            <button
              type="button"
              onClick={
                resetFilters
              }
              disabled={
                isPending
              }
              className="min-h-11 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 text-[11px] text-white/58 transition hover:border-white/20 hover:text-white/75 disabled:opacity-50"
            >
              {isPersian
                ? "پاک‌کردن"
                : "Clear"}
            </button>

            <button
              type="submit"
              disabled={
                isPending ||
                invalidPriceRange
              }
              className="group relative flex min-h-11 items-center justify-center gap-2 whitespace-nowrap overflow-hidden rounded-full border border-[#e0c16d]/48 bg-[linear-gradient(100deg,rgba(112,80,20,0.2),rgba(218,183,90,0.25),rgba(112,80,20,0.2))] px-5 text-[11px] font-medium text-[#f4e2ae] transition hover:-translate-y-0.5 hover:border-[#f0d681]/80 hover:shadow-[0_0_20px_rgba(218,183,91,0.1)] disabled:opacity-50"
            >
              <FilterRuneIcon className="h-[17px] w-[17px]" />

              <span>
                {isPending
                  ? isPersian
                    ? "در حال جست‌وجو..."
                    : "Searching..."
                  : isPersian
                    ? "اعمال فیلتر"
                    : "Apply filters"}
              </span>
            </button>
          </div>
        </div>

        <p
          className={[
            "-mt-1 text-center text-[10px] leading-5",
            invalidPriceRange
              ? "text-rose-200/75"
              : "text-white/42",
            filtersOpen
              ? "block"
              : "hidden",
            "lg:block",
          ].join(" ")}
        >
          {invalidPriceRange
            ? isPersian
              ? "حداقل قیمت نمی‌تواند بیشتر از حداکثر قیمت باشد."
              : "Minimum price cannot be greater than maximum price."
            : isPersian
              ? "بازه قیمت براساس قیمت نهایی زنده و فرمول مخصوص طلا یا نقره محاسبه می‌شود."
              : "The price range uses the live final price and the formula assigned to gold or silver."}
        </p>
      </div>
    </form>
  );
}