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
  BraceletRuneIcon,
  EarringRuneIcon,
  NecklaceRuneIcon,
} from "@/components/luxury-icons";

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

type ProductCatalogFiltersProps = {
  locale: string;

  initialFilters: {
    search: string;
    material: MaterialFilter;
    collection: CollectionFilter;
    minPrice: string;
    maxPrice: string;
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
    initialFilters.minPrice,
  );

  const [
    maxPrice,
    setMaxPrice,
  ] = useState(
    initialFilters.maxPrice,
  );

  const submitFilters = (
    event?: FormEvent,
  ) => {
    event?.preventDefault();

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

    const query =
      params.toString();

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

    startTransition(() => {
      router.push(
        pathname,
        {
          scroll: false,
        },
      );
    });
  };

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

  const collectionChoices = [
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
      value: "necklaces",
      label:
        isPersian
          ? "گردنبند"
          : "Necklaces",

      Icon:
        NecklaceRuneIcon,
    },

    {
      value: "bracelets",
      label:
        isPersian
          ? "دستبند"
          : "Bracelets",

      Icon:
        BraceletRuneIcon,
    },

    {
      value: "earrings",
      label:
        isPersian
          ? "گوشواره"
          : "Earrings",

      Icon:
        EarringRuneIcon,
    },
  ] as const;

  return (
    <form
      onSubmit={
        submitFilters
      }
      className="relative mx-auto max-w-6xl overflow-hidden rounded-[1.55rem] border border-[#d9b85f]/20 bg-[linear-gradient(145deg,rgba(7,38,28,0.9),rgba(2,21,15,0.94))] p-3 shadow-[0_20px_55px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-4"
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
        {/* جست‌وجو */}
        <div className="grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <label
              htmlFor="product-search"
              className="mb-1.5 block text-[10px] text-[#cfbc8a]/70"
            >
              {isPersian
                ? "جست‌وجوی محصول"
                : "Search products"}
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
                    ? "نام محصول یا کد محصول..."
                    : "Product name or SKU..."
                }
                className="h-11 w-full rounded-xl border border-[#d9b85f]/22 bg-[#031d15]/90 pe-4 ps-11 text-xs text-[#f2e8d5] outline-none placeholder:text-[#a99f89]/40 transition focus:border-[#e4c873]/55 focus:shadow-[0_0_18px_rgba(218,184,95,0.08)]"
              />
            </div>
          </div>

          {/* جنس محصول */}
          <div>
            <span className="mb-1.5 block text-[10px] text-[#cfbc8a]/70">
              {isPersian
                ? "جنس محصول"
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
                        "group flex min-h-11 items-center justify-center gap-1.5 rounded-xl border px-2 text-[10px] transition duration-300",
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
        </div>

        {/* دسته‌بندی محصول */}
        <div>
          <span className="mb-1.5 block text-[10px] text-[#cfbc8a]/70">
            {isPersian
              ? "دسته‌بندی قطعه"
              : "Piece category"}
          </span>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {collectionChoices.map(
              ({
                value,
                label,
                Icon,
              }) => {
                const active =
                  collection ===
                  value;

                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setCollection(
                        value,
                      )
                    }
                    className={[
                      "group flex min-h-10 items-center justify-center gap-1.5 rounded-xl border px-2 text-[10px] transition duration-300",
                      active
                        ? "border-[#e4c873]/45 bg-[#d7b65c]/[0.09] text-[#f1d993] shadow-[0_0_14px_rgba(218,184,95,0.07)]"
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

        {/* بازه قیمت */}
        <div className="grid items-end gap-3 lg:grid-cols-[1fr_1fr_auto]">
          <label className="relative">
            <span className="mb-1.5 block text-[10px] text-[#cfbc8a]/70">
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
              className="h-10 w-full rounded-xl border border-[#d9b85f]/20 bg-[#031d15]/90 pe-14 ps-3 text-[11px] text-[#e8ddc7] outline-none placeholder:text-white/25 transition focus:border-[#e4c873]/50"
            />

            <span className="pointer-events-none absolute bottom-[11px] end-3 text-[9px] text-[#d4bd7a]/50">
              {isPersian
                ? "تومان"
                : "Toman"}
            </span>
          </label>

          <label className="relative">
            <span className="mb-1.5 block text-[10px] text-[#cfbc8a]/70">
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
              className="h-10 w-full rounded-xl border border-[#d9b85f]/20 bg-[#031d15]/90 pe-14 ps-3 text-[11px] text-[#e8ddc7] outline-none placeholder:text-white/25 transition focus:border-[#e4c873]/50"
            />

            <span className="pointer-events-none absolute bottom-[11px] end-3 text-[9px] text-[#d4bd7a]/50">
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
              className="min-h-10 whitespace-nowrap rounded-full border border-white/10 bg-white/[0.03] px-4 text-[10px] text-white/50 transition hover:border-white/20 hover:text-white/75 disabled:opacity-50"
            >
              {isPersian
                ? "پاک‌کردن"
                : "Clear"}
            </button>

            <button
              type="submit"
              disabled={
                isPending
              }
              className="group relative flex min-h-10 items-center justify-center gap-2 whitespace-nowrap overflow-hidden rounded-full border border-[#e0c16d]/48 bg-[linear-gradient(100deg,rgba(112,80,20,0.2),rgba(218,183,90,0.25),rgba(112,80,20,0.2))] px-5 text-[10px] font-medium text-[#f4e2ae] transition hover:-translate-y-0.5 hover:border-[#f0d681]/80 hover:shadow-[0_0_20px_rgba(218,183,91,0.1)] disabled:opacity-50"
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

        <p className="-mt-1 text-center text-[9px] leading-5 text-white/30">
          {isPersian
            ? "بازه قیمت براساس قیمت نهایی زنده و فرمول مخصوص طلا یا نقره محاسبه می‌شود."
            : "The price range uses the live final price and the formula assigned to gold or silver."}
        </p>
      </div>
    </form>
  );
}