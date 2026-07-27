import Image from "next/image";
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

import type {
  ReactNode,
} from "react";

import {
  Gem,
  Hash,
  PackageCheck,
  Percent,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  AddToCartButton,
} from "@/components/add-to-cart-button";

import {
  AmbientEffects,
} from "@/components/ambient-effects";

import {
  MagicArrowIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";

import {
  GoldRuneIcon,
  SilverRuneIcon,
} from "@/components/material-rune-icons";

import {
  SiteHeader,
} from "@/components/site-header";

import {
  ProductPricingError,
  getProductDisplayPrice,
} from "@/lib/product-pricing";

import {
  prisma,
} from "@/lib/prisma";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

const persianTitleFont =
  Noto_Nastaliq_Urdu({
    subsets: ["arabic"],

    weight: [
      "400",
      "500",
      "600",
      "700",
    ],

    display: "swap",
  });

type ProductPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

const collectionNames: Record<
  string,
  {
    fa: string;
    en: string;
  }
> = {
  necklaces: {
    fa: "گردنبندها",
    en: "Necklaces",
  },

  bracelets: {
    fa: "دستبندها",
    en: "Bracelets",
  },

  earrings: {
    fa: "گوشواره‌ها",
    en: "Earrings",
  },
};

const fallbackImages: Record<
  string,
  string
> = {
  necklaces:
    "/images/collections/necklaces.jfif",

  bracelets:
    "/images/collections/bracelet.jpg",

  earrings:
    "/images/collections/earring.jpg",
};

function formatToman(
  value: string,
  locale: string,
): string {
  try {
    return BigInt(
      value,
    ).toLocaleString(
      locale === "fa"
        ? "fa-IR"
        : "en-US",
    );
  } catch {
    return value;
  }
}

function formatDecimal(
  value:
    | string
    | number
    | null,
  locale: string,
): string {
  if (
    value === null ||
    value === ""
  ) {
    return "—";
  }

  const numericValue =
    Number(value);

  if (
    !Number.isFinite(
      numericValue,
    )
  ) {
    return String(value);
  }

  return numericValue.toLocaleString(
    locale === "fa"
      ? "fa-IR"
      : "en-US",
    {
      maximumFractionDigits: 3,
    },
  );
}

function SpecificationItem({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-h-20 items-center gap-3 rounded-2xl border border-white/[0.065] bg-white/[0.025] px-4 py-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d9b85f]/22 bg-[#d9b85f]/[0.045] text-[#d9be72]">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-[9px] text-white/38">
          {label}
        </span>

        <strong className="mt-1 block truncate text-xs font-medium text-[#e8ddc8]">
          {value}
        </strong>
      </span>
    </div>
  );
}

function PriceInformationItem({
  icon,
  label,
  value,
  isGold,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  isGold: boolean;
}) {
  return (
    <div
      className={[
        "relative overflow-hidden rounded-2xl border px-4 py-4",
        isGold
          ? "border-[#d9b85f]/20 bg-[#d9b85f]/[0.035]"
          : "border-[#dce6e9]/16 bg-[#dce6e9]/[0.025]",
      ].join(" ")}
    >
      <div className="flex items-center gap-2">
        <span
          className={[
            "flex h-8 w-8 items-center justify-center rounded-lg border",
            isGold
              ? "border-[#d9b85f]/25 bg-[#d9b85f]/[0.055] text-[#e4c46d]"
              : "border-[#dce6e9]/20 bg-[#dce6e9]/[0.04] text-[#dfe8eb]",
          ].join(" ")}
        >
          {icon}
        </span>

        <span className="text-[9px] text-white/40">
          {label}
        </span>
      </div>

      <strong
        className={[
          "mt-3 block text-sm font-medium",
          isGold
            ? "text-[#f0d78f]"
            : "text-[#e3ecee]",
        ].join(" ")}
      >
        {value}
      </strong>
    </div>
  );
}

export default async function ProductPage({
  params,
}: ProductPageProps) {
  const {
    locale,
    slug,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  setRequestLocale(locale);

  const isPersian =
    locale === "fa";

  let result;

  try {
    result =
      await getProductDisplayPrice({
        slug,
      });
  } catch (error) {
    if (
      error instanceof
        ProductPricingError &&
      error.code ===
        "PRODUCT_NOT_FOUND"
    ) {
      notFound();
    }

    throw error;
  }

  const productRecord =
    await prisma.product.findFirst({
      where: {
        id:
          result.product.id,
      },

      select: {
        collectionId: true,
        legendFa: true,
        legendEn: true,
      },
    });

  const image =
    await prisma.productImage.findFirst({
      where: {
        productId:
          result.product.id,
      },

      orderBy: [
        {
          isPrimary: "desc",
        },
        {
          displayOrder: "asc",
        },
      ],

      select: {
        imageUrl: true,
        altFa: true,
        altEn: true,
      },
    });

  const collection =
    productRecord
      ? await prisma.collection.findUnique({
          where: {
            id:
              productRecord.collectionId,
          },

          select: {
            slug: true,
          },
        })
      : null;

  const isGold =
    result.product.material ===
    "GOLD";

  const MaterialIcon =
    isGold
      ? GoldRuneIcon
      : SilverRuneIcon;

  const materialSlug =
    isGold
      ? "gold"
      : "silver";

  const materialLabel =
    isGold
      ? isPersian
        ? "طلا"
        : "Gold"
      : isPersian
        ? "نقره"
        : "Silver";

  const weightLabel =
    isGold
      ? isPersian
        ? "وزن طلا"
        : "Gold weight"
      : isPersian
        ? "وزن نقره"
        : "Silver weight";

  const liveRateLabel =
    isGold
      ? isPersian
        ? "نرخ لحظه‌ای طلا"
        : "Live gold rate"
      : isPersian
        ? "نرخ لحظه‌ای نقره"
        : "Live silver rate";

  const productName =
    isPersian
      ? result.product.nameFa
      : result.product.nameEn;

  const secondaryName =
    isPersian
      ? result.product.nameEn
      : result.product.nameFa;

  const collectionSlug =
    collection?.slug ??
    "necklaces";

  const collectionLabel =
    collectionNames[
      collectionSlug
    ]?.[
      isPersian
        ? "fa"
        : "en"
    ] ??
    collectionSlug;

  const backHref =
    collection?.slug
      ? `/${locale}/collections/${collection.slug}/${materialSlug}`
      : `/${locale}/products`;

  const imageUrl =
    image?.imageUrl ??
    fallbackImages[
      collectionSlug
    ] ??
    "/images/collections/necklaces.jfif";

  const imageAlt =
    isPersian
      ? image?.altFa ??
        result.product.nameFa
      : image?.altEn ??
        result.product.nameEn;

  const weight =
    result.variant
      ?.weightGrams ??
    result.product.weightGrams;

  const purity =
    result.variant
      ?.purity ??
    result.product.purity;

  const purityFineness =
    result.variant
      ?.purityFineness ??
    result.product
      .purityFineness;

  const stock =
    result.variant
      ?.stock ??
    result.product.stock;

  const sku =
    result.variant?.sku ??
    result.product.sku;

  const taxPercent =
    result.pricing.breakdown
      ?.taxPercent ??
    result.policy
      .defaultTaxPercent;

  const finalPrice =
    `${formatToman(
      result.pricing
        .finalPriceToman,
      locale,
    )} ${
      isPersian
        ? "تومان"
        : "Toman"
    }`;

  const formattedWeight =
    weight
      ? `${formatDecimal(
          weight,
          locale,
        )} ${
          isPersian
            ? "گرم"
            : "g"
        }`
      : "—";

  const formattedLiveRate =
    result.liveRate
      ? `${formatToman(
          result.liveRate
            .pricePerGramToman,
          locale,
        )} ${
          isPersian
            ? "تومان"
            : "Toman"
        }`
      : isPersian
        ? "قیمت ثابت"
        : "Manual price";

  const formattedTax =
    `${formatDecimal(
      taxPercent,
      locale,
    )}٪`;

  const hiddenLegend =
    isPersian
      ? productRecord?.legendFa
      : productRecord?.legendEn;

  const legendText =
    hiddenLegend?.trim() ||
    (isPersian
      ? "افسانه این قطعه هنوز در دفتر رازهای الوریا ثبت نشده است."
      : "The legend of this piece has not yet been written in Eloria’s book of secrets.");

  return (
    <main
      dir={
        isPersian
          ? "rtl"
          : "ltr"
      }
      className="relative min-h-screen overflow-hidden bg-[#02140e] text-[#f8f0df]"
    >
      <AmbientEffects />
      <SiteHeader />

      <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[130px] sm:px-6 sm:pt-[142px] lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={backHref}
            className="group flex w-fit items-center gap-3 rounded-full border border-[#d9b85f]/32 bg-[#061f17]/80 py-1.5 pe-4 ps-1.5 text-[11px] text-[#e5d19a] transition hover:-translate-y-0.5 hover:border-[#efd17d]/65"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9b85f]/25">
              <MagicArrowIcon
                className={[
                  "h-4 w-4",
                  isPersian
                    ? ""
                    : "rotate-180",
                ].join(" ")}
              />
            </span>

            <span>
              {isPersian
                ? `بازگشت به گنجینه ${collectionLabel}`
                : `Back to ${collectionLabel}`}
            </span>
          </Link>

          <Link
            href={`/${locale}/collections`}
            className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[10px] text-white/45 transition hover:border-[#d9b85f]/25 hover:text-[#ead699]"
          >
            <WorldRuneIcon className="h-4 w-4" />

            <span>
              {isPersian
                ? "دنیای الوریا"
                : "Eloria World"}
            </span>
          </Link>
        </div>

        <div className="mt-7 grid items-start gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(380px,0.95fr)]">
          {/* تصویر محصول */}
          <div
            className={[
              "relative overflow-hidden rounded-[2.5rem] border bg-[linear-gradient(145deg,rgba(8,36,27,0.96),rgba(2,20,14,0.99))] p-3 shadow-[0_35px_100px_rgba(0,0,0,0.48)]",
              isGold
                ? "border-[#d8b860]/25"
                : "border-[#d8e3e6]/20",
            ].join(" ")}
          >
            <div
              aria-hidden="true"
              className={[
                "absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
                isGold
                  ? "via-[#efd480]/70"
                  : "via-[#e1ebee]/50",
              ].join(" ")}
            />

            <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-white/[0.06] bg-[#031811]">
              <Image
                src={imageUrl}
                alt={imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                className="object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-[#01130d]/82 via-transparent to-black/10" />

              <div className="absolute start-5 top-5">
                <span
                  className={[
                    "flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] backdrop-blur-xl",
                    isGold
                      ? "border-[#e3c775]/40 bg-[#4c3a12]/50 text-[#f1d98f]"
                      : "border-[#d8e1e4]/35 bg-[#526268]/35 text-[#e2eaed]",
                  ].join(" ")}
                >
                  <MaterialIcon className="h-5 w-5" />

                  <span>
                    {materialLabel}
                  </span>
                </span>
              </div>

              {!result.product
                .isPurchasable && (
                <div className="absolute end-5 top-5 rounded-full border border-rose-200/20 bg-[#47131b]/75 px-4 py-2 text-[10px] text-rose-100 backdrop-blur-xl">
                  {isPersian
                    ? "ناموجود"
                    : "Unavailable"}
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 p-6">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.32em] text-[#d2bd83]/65">
                      Eloria Jewelry
                    </p>

                    <p className="mt-2 text-sm text-[#efe3c9]/75">
                      {collectionLabel}
                    </p>
                  </div>

                  <div
                    className={[
                      "relative flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-xl",
                      isGold
                        ? "border-[#efd17a]/42 bg-[#4b3810]/45 text-[#efd17a]"
                        : "border-[#dae5e8]/35 bg-[#59686e]/30 text-[#e3ecee]",
                    ].join(" ")}
                  >
                    <span className="absolute inset-[6px] rounded-full border border-dashed border-current opacity-25" />

                    <MaterialIcon className="relative h-9 w-9" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* اطلاعات محصول */}
          <div className="grid gap-5">
            <article
              className={[
                "relative overflow-hidden rounded-[2.2rem] border bg-[linear-gradient(145deg,rgba(7,34,25,0.96),rgba(2,20,14,0.99))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.38)] sm:p-7",
                isGold
                  ? "border-[#d8b860]/23"
                  : "border-[#d6e1e4]/18",
              ].join(" ")}
            >
              <div
                aria-hidden="true"
                className={[
                  "absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
                  isGold
                    ? "via-[#efd17a]/65"
                    : "via-[#dce6e9]/45",
                ].join(" ")}
              />

              <div className="flex items-center gap-3">
                <span
                  className={[
                    "flex h-11 w-11 items-center justify-center rounded-xl border",
                    isGold
                      ? "border-[#d9b85f]/30 bg-[#d9b85f]/[0.06] text-[#e6c873]"
                      : "border-[#dce6e9]/25 bg-[#dce6e9]/[0.045] text-[#dce6e9]",
                  ].join(" ")}
                >
                  <MaterialIcon className="h-6 w-6" />
                </span>

                <div>
                  <span className="block text-[9px] uppercase tracking-[0.3em] text-[#ccb77a]/55">
                    {materialLabel}
                  </span>

                  <span className="mt-1 block text-[10px] text-white/38">
                    {isPersian
                      ? "قطعه‌ای از گنجینه الوریا"
                      : "A piece from Eloria’s collection"}
                  </span>
                </div>
              </div>

              <h1
                className={[
                  "mt-5 text-[#f5e8cc]",
                  isPersian
                    ? `${persianTitleFont.className} pb-2 text-3xl font-semibold leading-[1.9] sm:text-4xl`
                    : "text-3xl font-semibold leading-tight sm:text-4xl",
                ].join(" ")}
              >
                {productName}
              </h1>

              <p
                dir="ltr"
                className={[
                  "text-xs tracking-[0.18em] text-[#c9b98f]/50",
                  isPersian
                    ? "text-right"
                    : "text-left",
                ].join(" ")}
              >
                {secondaryName}
              </p>

              {result.variant && (
                <p className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-xs text-[#daceb7]/70">
                  {isPersian
                    ? result.variant
                        .titleFa
                    : result.variant
                        .titleEn}
                </p>
              )}

              {/* قیمت نهایی */}
              <div
                className={[
                  "mt-6 rounded-[1.8rem] border p-5",
                  isGold
                    ? "border-[#d9b85f]/30 bg-[radial-gradient(circle_at_top,rgba(213,178,79,0.12),rgba(3,27,19,0.75)_65%)]"
                    : "border-[#dce6e9]/22 bg-[radial-gradient(circle_at_top,rgba(220,230,233,0.08),rgba(3,27,19,0.75)_65%)]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[10px] text-white/45">
                    {isPersian
                      ? "قیمت نهایی"
                      : "Final price"}
                  </span>

                  <Sparkles
                    className={[
                      "h-5 w-5",
                      isGold
                        ? "text-[#e8ca74]"
                        : "text-[#dfe9ec]",
                    ].join(" ")}
                  />
                </div>

                <strong
                  className={[
                    "mt-3 block text-2xl font-semibold sm:text-3xl",
                    isGold
                      ? "text-[#f4dc95]"
                      : "text-[#e5edef]",
                  ].join(" ")}
                >
                  {finalPrice}
                </strong>

                <div className="mt-5 grid gap-2 sm:grid-cols-3">
                  <PriceInformationItem
                    icon={
                      <Scale className="h-4 w-4" />
                    }
                    label={
                      weightLabel
                    }
                    value={
                      formattedWeight
                    }
                    isGold={
                      isGold
                    }
                  />

                  <PriceInformationItem
                    icon={
                      <MaterialIcon className="h-4 w-4" />
                    }
                    label={
                      liveRateLabel
                    }
                    value={
                      formattedLiveRate
                    }
                    isGold={
                      isGold
                    }
                  />

                  <PriceInformationItem
                    icon={
                      <Percent className="h-4 w-4" />
                    }
                    label={
                      isPersian
                        ? "درصد مالیات"
                        : "Tax percentage"
                    }
                    value={
                      formattedTax
                    }
                    isGold={
                      isGold
                    }
                  />
                </div>
              </div>

              <div className="mt-5">
                <AddToCartButton
  locale={locale}
  slug={
    result.product
      .slug
  }
  variantId={
    result.variant
      ?.id ?? null
  }
  maxQuantity={
    result.variant
      ?.stock ??
    result.product
      .stock
  }
  disabled={
    !result.product
      .isPurchasable ||
    (
      result.variant
        ?.stock ??
      result.product
        .stock
    ) <= 0
  }
/>
              </div>
            </article>

            {/* مشخصات محصول */}
            <article className="rounded-[2rem] border border-[#d9b85f]/18 bg-[#061c15]/78 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.3)] sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#d9bd70]" />

                <h2 className="text-sm font-medium text-[#ebdfc8]">
                  {isPersian
                    ? "مشخصات محصول"
                    : "Product specifications"}
                </h2>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <SpecificationItem
                  icon={
                    <MaterialIcon className="h-5 w-5" />
                  }
                  label={
                    isPersian
                      ? "جنس"
                      : "Material"
                  }
                  value={
                    materialLabel
                  }
                />

                <SpecificationItem
                  icon={
                    <Gem className="h-5 w-5" />
                  }
                  label={
                    isPersian
                      ? "عیار"
                      : "Purity"
                  }
                  value={
                    purity ??
                    (purityFineness
                      ? formatDecimal(
                          purityFineness,
                          locale,
                        )
                      : "—")
                  }
                />

                <SpecificationItem
                  icon={
                    <PackageCheck className="h-5 w-5" />
                  }
                  label={
                    isPersian
                      ? "موجودی"
                      : "Stock"
                  }
                  value={
                    stock > 0
                      ? `${stock.toLocaleString(
                          isPersian
                            ? "fa-IR"
                            : "en-US",
                        )} ${
                          isPersian
                            ? "عدد"
                            : "items"
                        }`
                      : isPersian
                        ? "ناموجود"
                        : "Out of stock"
                  }
                />

                <SpecificationItem
                  icon={
                    <Hash className="h-5 w-5" />
                  }
                  label={
                    isPersian
                      ? "کد محصول"
                      : "SKU"
                  }
                  value={
                    sku ?? "—"
                  }
                />
              </div>
            </article>
          </div>
        </div>

        {/* افسانه پنهان */}
        <article className="relative mt-8 overflow-hidden rounded-[2.2rem] border border-[#d9b85f]/22 bg-[linear-gradient(135deg,rgba(8,39,29,0.94),rgba(2,20,14,0.98))] px-5 py-7 shadow-[0_28px_80px_rgba(0,0,0,0.34)] sm:px-8 sm:py-8">
          <div
            aria-hidden="true"
            className="absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-[#efd17a]/65 to-transparent"
          />

          <div
            aria-hidden="true"
            className="absolute -end-20 -top-24 h-52 w-52 rounded-full bg-[#d9b85f]/[0.045] blur-3xl"
          />

          <div
            aria-hidden="true"
            className="absolute -bottom-24 -start-20 h-52 w-52 rounded-full bg-emerald-300/[0.035] blur-3xl"
          />

          <div className="relative flex flex-col items-center gap-5 text-center sm:flex-row sm:text-start">
            <div className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[#dfc36f]/35 bg-[#d9b85f]/[0.06] text-[#ead07d] shadow-[0_0_35px_rgba(218,184,95,0.08)]">
              <span className="absolute inset-[7px] rounded-full border border-dashed border-[#e2c771]/25" />

              <ScrollText className="relative h-8 w-8" />

              <Sparkles className="absolute -end-1 top-1 h-4 w-4 text-[#f0d986]" />
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[9px] uppercase tracking-[0.32em] text-[#d4bd7a]/50">
                Eloria Secret Legend
              </span>

              <h2
                className={[
                  "mt-2 text-[#f0dfb7]",
                  isPersian
                    ? `${persianTitleFont.className} text-2xl font-semibold leading-[1.8]`
                    : "text-xl font-semibold",
                ].join(" ")}
              >
                {isPersian
                  ? "افسانه پنهان"
                  : "The Hidden Legend"}
              </h2>

              <p className="mt-2 text-xs leading-7 text-[#d7c9aa]/65 sm:text-sm">
                {legendText}
              </p>
            </div>
          </div>
        </article>
      </section>
    </main>
  );
}