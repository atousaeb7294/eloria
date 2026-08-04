import Link from "next/link";
import type { Metadata } from "next";

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
  InternalPageShell,
} from "@/components/internal-page-shell";

import {
  ProductGallery,
} from "@/components/product-gallery";

import {
  ProductVariantSelector,
} from "@/components/product-variant-selector";

import {
  MagicArrowIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";

import {
  GoldRuneIcon,
  SilverRuneIcon,
} from "@/components/material-rune-icons";

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

type ProductPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;

  searchParams: Promise<{
    variant?: string | string[];
  }>;
};

export async function generateMetadata({
  params,
}: Pick<ProductPageProps, "params">): Promise<Metadata> {
  const { locale, slug } = await params;
  if (locale !== "fa" && locale !== "en") return {};
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      nameFa: true,
      nameEn: true,
      descriptionFa: true,
      descriptionEn: true,
      status: true,
      updatedAt: true,
      images: { orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }], take: 1, select: { imageUrl: true, altFa: true, altEn: true } },
    },
  });
  if (!product) return { robots: { index: false, follow: false } };
  const isPersian = locale === "fa";
  const title = isPersian ? product.nameFa : product.nameEn;
  const description = (isPersian ? product.descriptionFa : product.descriptionEn)?.slice(0, 160) || title;
  const image = product.images[0];
  const path = `/${locale}/products/${slug}`;
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { fa: `/fa/products/${slug}`, en: `/en/products/${slug}` },
    },
    robots: { index: product.status !== "ARCHIVED" && product.status !== "DRAFT", follow: true },
    openGraph: {
      type: "website",
      title,
      description,
      url: path,
      images: image ? [{ url: image.imageUrl, alt: (isPersian ? image.altFa : image.altEn) || title }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description, images: image ? [image.imageUrl] : undefined },
  };
}

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
    return String(
      value,
    );
  }

  return numericValue.toLocaleString(
    locale === "fa"
      ? "fa-IR"
      : "en-US",
    {
      maximumFractionDigits:
        3,
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
    <div className="group flex min-h-20 items-center gap-3 rounded-2xl border border-white/[0.065] bg-white/[0.025] px-4 py-3 transition duration-300 hover:border-[#d9b85f]/20 hover:bg-white/[0.04]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#d9b85f]/22 bg-[#d9b85f]/[0.045] text-[#d9be72] transition duration-300 group-hover:scale-105 group-hover:border-[#e5c975]/35">
        {icon}
      </span>

      <span className="min-w-0">
        <span className="block text-[10px] text-white/48">
          {label}
        </span>

        <strong className="mt-1 block truncate text-sm font-medium text-[#e8ddc8]">
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

        <span className="text-[10px] text-white/48">
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

function PurchaseAssuranceItem({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-white/[0.065] bg-black/10 px-3.5 py-3.5">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d9b85f]/22 bg-[#d9b85f]/[0.05] text-[#dfc16e]">
        {icon}
      </span>

      <span className="min-w-0">
        <strong className="block text-[11px] font-medium text-[#eadfc9]">
          {title}
        </strong>

        <span className="mt-1 block text-[10px] leading-5 text-white/42">
          {description}
        </span>
      </span>
    </div>
  );
}

export default async function ProductPage({
  params,
  searchParams,
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

  setRequestLocale(
    locale,
  );

  const isPersian =
    locale === "fa";

  const productRecord =
    await prisma.product.findUnique({
      where: {
        slug,
      },

      select: {
        id:
          true,

        descriptionFa:
          true,

        descriptionEn:
          true,

        legendFa:
          true,

        legendEn:
          true,

        collection: {
          select: {
            slug:
              true,
          },
        },

        images: {
          orderBy: [
            {
              isPrimary:
                "desc",
            },

            {
              displayOrder:
                "asc",
            },
          ],

          select: {
            imageUrl:
              true,

            altFa:
              true,

            altEn:
              true,
          },
        },

        variants: {
          where: {
            isActive:
              true,
          },

          orderBy: [
            {
              displayOrder:
                "asc",
            },

            {
              createdAt:
                "asc",
            },
          ],

          select: {
            id:
              true,

            titleFa:
              true,

            titleEn:
              true,

            stock:
              true,

            metalWeight:
              true,

            purity:
              true,
          },
        },
      },
    });

  if (!productRecord) {
    notFound();
  }

  const resolvedSearchParams =
    await searchParams;

  const requestedVariant =
    Array.isArray(
      resolvedSearchParams.variant,
    )
      ? resolvedSearchParams
          .variant[0]
      : resolvedSearchParams
          .variant;

  const selectedVariantId =
    requestedVariant &&
    productRecord.variants.some(
      (variant) =>
        variant.id ===
        requestedVariant,
    )
      ? requestedVariant
      : productRecord.variants.find(
          (variant) =>
            variant.stock > 0,
        )?.id ??
        productRecord.variants[0]
          ?.id ?? null;

  let result;

  try {
    result =
      await getProductDisplayPrice({
        slug,
        variantId:
          selectedVariantId,
      });
  } catch (error) {
    if (
      error instanceof
        ProductPricingError &&
      (error.code ===
        "PRODUCT_NOT_FOUND" ||
        error.code ===
          "VARIANT_NOT_FOUND")
    ) {
      notFound();
    }

    throw error;
  }

  const collection =
    productRecord.collection;

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

  const fallbackImage =
    fallbackImages[
      collectionSlug
    ] ??
    "/images/collections/necklaces.jfif";

  const galleryImages =
    productRecord.images.length > 0
      ? productRecord.images.map(
          (productImage) => ({
            imageUrl:
              productImage.imageUrl,

            alt:
              isPersian
                ? productImage.altFa ??
                  result.product.nameFa
                : productImage.altEn ??
                  result.product.nameEn,
          }),
        )
      : [
          {
            imageUrl:
              fallbackImage,

            alt:
              productName,
          },
        ];

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
    result.variant
      ?.sku ??
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

  const productDescription =
    (isPersian
      ? productRecord.descriptionFa
      : productRecord.descriptionEn
    )?.trim() ||
    (isPersian
      ? "این قطعه با تمرکز بر ظرافت، دوام و هویت افسانه‌ای الوریا طراحی شده است."
      : "This piece is designed around refinement, durability, and Eloria’s legendary identity.");

  const hiddenLegend =
    isPersian
      ? productRecord.legendFa
      : productRecord.legendEn;

  const legendText =
    hiddenLegend?.trim() ||
    (
      isPersian
        ? "افسانه این قطعه هنوز در دفتر رازهای الوریا ثبت نشده است."
        : "The legend of this piece has not yet been written in Eloria’s book of secrets."
    );

  return (
    <InternalPageShell
      locale={locale}
    >
      <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[130px] sm:px-6 sm:pt-[142px] lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={backHref}
            className="group flex w-fit items-center gap-3 rounded-full border border-[#d9b85f]/32 bg-[#061f17]/80 py-1.5 pe-4 ps-1.5 text-[11px] text-[#e5d19a] transition hover:border-[#efd17d]/65"
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
                ? `بازگشت به ${collectionLabel}`
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
          <div
            className={[
              "relative overflow-visible rounded-[2.5rem] border bg-[linear-gradient(145deg,rgba(8,36,27,0.96),rgba(2,20,14,0.99))] p-3 shadow-[0_35px_100px_rgba(0,0,0,0.48)] transition-[border-color,box-shadow] duration-500",

              isGold
                ? "border-[#d8b860]/25 hover:border-[#ebcf7b]/42 hover:shadow-[0_42px_120px_rgba(0,0,0,0.56),0_0_44px_rgba(216,184,96,0.08)]"
                : "border-[#d8e3e6]/20 hover:border-[#e1ecef]/34 hover:shadow-[0_42px_120px_rgba(0,0,0,0.56),0_0_44px_rgba(216,229,233,0.06)]",
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

            <ProductGallery
              locale={locale}
              images={galleryImages}
              materialLabel={materialLabel}
              collectionLabel={collectionLabel}
              isGold={isGold}
              unavailable={
                !result.product
                  .isPurchasable
              }
            />
          </div>

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
                      ? "جواهری از جهان الوریا"
                      : "A piece from Eloria’s collection"}
                  </span>
                </div>
              </div>

              <h1
                className={[
                  "mt-5 text-[#f5e8cc]",

                  isPersian
                    ? `font-persian-title pb-2 text-3xl font-semibold leading-[1.9] sm:text-4xl`
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

              <ProductVariantSelector
                locale={locale}
                productSlug={
                  result.product.slug
                }
                variants={
                  productRecord.variants.map(
                    (variant) => ({
                      ...variant,
                      metalWeight:
                        variant.metalWeight
                          ?.toString() ??
                        null,
                    }),
                  )
                }
                activeVariantId={
                  result.variant?.id ??
                  null
                }
                isGold={isGold}
              />

              <div
                className={[
                  "mt-6 rounded-[1.8rem] border p-5",

                  isGold
                    ? "border-[#d9b85f]/30 bg-[radial-gradient(circle_at_top,rgba(213,178,79,0.12),rgba(3,27,19,0.75)_65%)]"
                    : "border-[#dce6e9]/22 bg-[radial-gradient(circle_at_top,rgba(220,230,233,0.08),rgba(3,27,19,0.75)_65%)]",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="block text-[10px] text-white/45">
                      {isPersian
                        ? "قیمت نهایی"
                        : "Final price"}
                    </span>

                    <span className="mt-1 block text-[9px] text-white/30">
                      {isPersian
                        ? "محاسبه‌شده بر پایه مشخصات انتخابی"
                        : "Calculated from the selected specifications"}
                    </span>
                  </div>

                  <span
                    className={[
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px]",
                      stock > 0 && result.product.isPurchasable
                        ? "border-emerald-200/15 bg-emerald-950/35 text-emerald-100/75"
                        : "border-rose-200/18 bg-rose-950/35 text-rose-100/75",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "h-1.5 w-1.5 rounded-full",
                        stock > 0 && result.product.isPurchasable
                          ? "bg-emerald-300"
                          : "bg-rose-300",
                      ].join(" ")}
                    />

                    {stock > 0 && result.product.isPurchasable
                      ? isPersian
                        ? "آماده سفارش"
                        : "Ready to order"
                      : isPersian
                        ? "ناموجود"
                        : "Unavailable"}
                  </span>
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
                      ?.id ??
                    null
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

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <PurchaseAssuranceItem
                  icon={<ShieldCheck className="h-4 w-4" />}
                  title={
                    isPersian
                      ? "قیمت‌گذاری شفاف"
                      : "Transparent pricing"
                  }
                  description={
                    isPersian
                      ? "مبلغ نهایی در سرور محاسبه می‌شود."
                      : "The final amount is calculated on the server."
                  }
                />

                <PurchaseAssuranceItem
                  icon={<PackageCheck className="h-4 w-4" />}
                  title={
                    isPersian
                      ? "موجودی واقعی"
                      : "Live availability"
                  }
                  description={
                    isPersian
                      ? "تعداد قابل سفارش از موجودی فعلی خوانده می‌شود."
                      : "Order limits use the current available stock."
                  }
                />

                <PurchaseAssuranceItem
                  icon={<Scale className="h-4 w-4" />}
                  title={
                    isPersian
                      ? "مشخصات دقیق"
                      : "Precise details"
                  }
                  description={
                    isPersian
                      ? "وزن، عیار و مدل انتخابی پیش از خرید مشخص است."
                      : "Weight, purity, and option are visible before purchase."
                  }
                />
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/[0.08] bg-[#061c15]/78 p-5 shadow-[0_24px_70px_rgba(0,0,0,0.28)] backdrop-blur-xl sm:p-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#d9b85f]/25 bg-[#d9b85f]/[0.055] text-[#dec16d]">
                  <ScrollText className="h-5 w-5" />
                </span>

                <div>
                  <span className="block text-[10px] uppercase tracking-[0.22em] text-[#cdb777]/55">
                    Eloria Details
                  </span>

                  <h2 className="mt-1 text-sm font-medium text-[#eee1ca]">
                    {isPersian
                      ? "درباره این محصول"
                      : "About this piece"}
                  </h2>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-line text-sm leading-8 text-[#d8cbb2]/72">
                {productDescription}
              </p>
            </article>

            <article className="rounded-[2rem] border border-[#d9b85f]/18 bg-[#061c15]/78 p-4 shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl sm:p-5">
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
                    (
                      purityFineness
                        ? formatDecimal(
                            purityFineness,
                            locale,
                          )
                        : "—"
                    )
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
                    sku ??
                    "—"
                  }
                />
              </div>
            </article>
          </div>
        </div>

        <article className="relative mt-8 overflow-hidden rounded-[2.2rem] border border-[#d9b85f]/22 bg-[linear-gradient(135deg,rgba(8,39,29,0.94),rgba(2,20,14,0.98))] px-5 py-7 shadow-[0_28px_80px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:px-8 sm:py-8">
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
                    ? `font-persian-title text-2xl font-semibold leading-[1.8]`
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
    </InternalPageShell>
  );
}