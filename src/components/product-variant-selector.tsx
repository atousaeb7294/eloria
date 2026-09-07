import Link from "next/link";

import {
  Check,
  Layers3,
} from "lucide-react";

type ProductVariantOption = {
  id: string;
  titleFa: string;
  titleEn: string;
  stock: number;
  metalWeight: string | null;
  purity: string | null;
};

type ProductVariantSelectorProps = {
  locale: string;
  productSlug: string;
  variants: ProductVariantOption[];
  activeVariantId: string | null;
  isGold: boolean;
};

function formatWeight(value: string | null, locale: string): string | null {
  if (!value) {
    return null;
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return `${numericValue.toLocaleString(locale === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 3,
  })} ${locale === "fa" ? "گرم" : "g"}`;
}

export function ProductVariantSelector({
  locale,
  productSlug,
  variants,
  activeVariantId,
  isGold,
}: ProductVariantSelectorProps) {
  if (variants.length === 0) {
    return null;
  }

  const isPersian = locale === "fa";

  return (
    <section className="mt-5" aria-labelledby="product-variant-title">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Layers3 className={isGold ? "h-4 w-4 text-[#e2c56f]" : "h-4 w-4 text-[#dce6e9]"} />
          <h2 id="product-variant-title" className="text-xs font-medium text-[#eadfc8]">
            {isPersian ? "انتخاب مدل محصول" : "Choose a product option"}
          </h2>
        </div>

        <span className="text-[10px] text-white/40">
          {isPersian ? "قیمت با انتخاب مدل به‌روز می‌شود" : "Price updates with your selection"}
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {variants.map((variant) => {
          const isActive = variant.id === activeVariantId;
          const isUnavailable = variant.stock <= 0;
          const weight = formatWeight(variant.metalWeight, locale);

          return (
            <Link
              key={variant.id}
              href={{
                pathname: `/${locale}/products/${productSlug}`,
                query: { variant: variant.id },
              }}
              scroll={false}
              aria-current={isActive ? "true" : undefined}
              className={[
                "group relative overflow-hidden rounded-2xl border px-4 py-3 transition duration-300",
                isActive
                  ? isGold
                    ? "border-[#e3c66f]/65 bg-[#d9b85f]/[0.09] shadow-[0_0_24px_rgba(218,184,95,0.1)]"
                    : "border-[#dce6e9]/55 bg-[#dce6e9]/[0.07] shadow-[0_0_24px_rgba(220,230,233,0.08)]"
                  : "border-white/[0.07] bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.045]",
                isUnavailable ? "opacity-55" : "",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <strong className="block truncate text-xs font-medium text-[#f0e4ce]">
                    {isPersian ? variant.titleFa : variant.titleEn}
                  </strong>

                  <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-white/45">
                    {weight && <span>{weight}</span>}
                    {variant.purity && <span>{variant.purity}</span>}
                    <span className={isUnavailable ? "text-rose-200/75" : "text-emerald-100/60"}>
                      {isUnavailable
                        ? isPersian
                          ? "ناموجود"
                          : "Out of stock"
                        : isPersian
                          ? `${variant.stock.toLocaleString("fa-IR")} موجود`
                          : `${variant.stock.toLocaleString("en-US")} available`}
                    </span>
                  </div>
                </div>

                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition",
                    isActive
                      ? isGold
                        ? "border-[#e5c974]/60 bg-[#d9b85f]/15 text-[#f1d88f]"
                        : "border-[#dce6e9]/50 bg-[#dce6e9]/10 text-[#e5eef0]"
                      : "border-white/10 text-transparent group-hover:text-white/30",
                  ].join(" ")}
                >
                  <Check className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
