import Image from "next/image";
import Link from "next/link";

import {
  InteractiveTiltCard,
} from "@/components/interactive-tilt-card";

import {
  MagicArrowIcon,
} from "@/components/luxury-icons";

import {
  ProductCardLivePrice,
} from "@/components/product-card-live-price";

import {
  GoldRuneIcon,
  SilverRuneIcon,
} from "@/components/material-rune-icons";

import type {
  CatalogProduct,
} from "@/lib/catalog";

type CatalogProductCardProps = {
  product: CatalogProduct;
  locale: string;
  eager?: boolean;
  showCollection?: boolean;
};

const fallbackImages: Record<string, string> = {
  necklaces: "/images/collections/necklaces.jfif",
  bracelets: "/images/collections/bracelet.jpg",
  earrings: "/images/collections/earring.jpg",
};

const collectionNames: Record<
  string,
  { fa: string; en: string }
> = {
  necklaces: { fa: "گردنبند", en: "Necklaces" },
  bracelets: { fa: "دستبند", en: "Bracelets" },
  earrings: { fa: "گوشواره", en: "Earrings" },
};

export function CatalogProductCard({
  product,
  locale,
  eager = false,
  showCollection = true,
}: CatalogProductCardProps) {
  const isPersian = locale === "fa";
  const isGold = product.material === "GOLD";
  const href = `/${locale}/products/${product.slug}`;

  const productName = isPersian
    ? product.nameFa
    : product.nameEn;

  const imageAlt = isPersian
    ? product.image?.altFa ?? product.nameFa
    : product.image?.altEn ?? product.nameEn;

  const materialLabel = isGold
    ? isPersian
      ? "طلا"
      : "Gold"
    : isPersian
      ? "نقره"
      : "Silver";

  const collectionName =
    collectionNames[product.collectionSlug]?.[
      isPersian ? "fa" : "en"
    ] ?? product.collectionSlug;

  const imageUrl =
    product.image?.imageUrl ??
    fallbackImages[product.collectionSlug] ??
    "/images/collections/necklaces.jfif";

  const MaterialIcon = isGold
    ? GoldRuneIcon
    : SilverRuneIcon;

  return (
    <InteractiveTiltCard className="group rounded-[1.75rem] sm:rounded-[2rem]">
      <article
        className={[
          "relative overflow-hidden rounded-[1.75rem] border bg-[linear-gradient(145deg,rgba(7,34,25,0.97),rgba(2,20,14,0.99))] p-3 shadow-[0_26px_70px_rgba(0,0,0,0.38)] transition-[border-color,box-shadow] duration-500 sm:rounded-[2rem]",
        isGold
          ? "border-[#d8b860]/22 hover:border-[#e8cc78]/55 hover:shadow-[0_34px_95px_rgba(0,0,0,0.5),0_0_34px_rgba(216,184,96,0.1)]"
          : "border-[#c5d2d7]/20 hover:border-[#dbe5e8]/45 hover:shadow-[0_34px_95px_rgba(0,0,0,0.5),0_0_34px_rgba(210,225,230,0.08)]",
        ].join(" ")}
      >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          isGold ? "via-[#f0d98d]/65" : "via-[#e4edf0]/50",
        ].join(" ")}
      />

      <Link
        href={href}
        aria-label={
          isPersian
            ? `مشاهده ${productName}`
            : `View ${productName}`
        }
        className="relative block aspect-[4/5] overflow-hidden rounded-[1.4rem] border border-white/[0.06] bg-[#031811] sm:rounded-[1.65rem]"
      >
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          unoptimized={/^https?:\/\//.test(imageUrl)}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-1000 ease-out group-hover:scale-[1.055]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#01120c]/92 via-transparent to-black/10"
        />

        <div className="absolute inset-x-3 top-3 flex items-start justify-between gap-2">
          <span
            className={[
              "flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] backdrop-blur-xl",
              isGold
                ? "border-[#e3c775]/35 bg-[#4c3a12]/55 text-[#f1d98f]"
                : "border-[#d8e1e4]/30 bg-[#526268]/40 text-[#e2eaed]",
            ].join(" ")}
          >
            <MaterialIcon className="h-4 w-4" />
            {materialLabel}
          </span>

          <span
            className={[
              "rounded-full border px-2.5 py-1.5 text-[10px] backdrop-blur-xl",
              product.isAvailable
                ? "border-emerald-200/18 bg-emerald-950/55 text-emerald-100/85"
                : "border-rose-200/20 bg-[#3f1118]/75 text-rose-100",
            ].join(" ")}
          >
            {product.isAvailable
              ? isPersian
                ? "موجود"
                : "Available"
              : isPersian
                ? "ناموجود"
                : "Out of stock"}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 translate-y-3 px-4 pb-4 opacity-0 transition duration-400 group-hover:translate-y-0 group-hover:opacity-100">
          <span className="flex min-h-11 items-center justify-center rounded-full border border-[#ead07e]/32 bg-[#031a13]/78 text-xs text-[#f1dda4] backdrop-blur-xl">
            {isPersian ? "مشاهده جواهر" : "View jewellery"}
          </span>
        </div>
      </Link>

      <div className="px-2 pb-2 pt-5 sm:px-3 sm:pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-medium leading-8 text-[#f4e8cc] sm:text-xl">
              <Link
                href={href}
                className="transition hover:text-[#f5dfa0]"
              >
                {productName}
              </Link>
            </h2>

            {showCollection && (
              <p className="mt-1 text-xs text-[#bdb094]/60">
                {collectionName}
              </p>
            )}
          </div>

          <span
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
              isGold
                ? "border-[#d8b860]/28 bg-[#d8b860]/[0.055] text-[#d9bd6c]"
                : "border-[#d6e0e4]/24 bg-[#d6e0e4]/[0.045] text-[#dbe5e8]",
            ].join(" ")}
          >
            <MaterialIcon className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-5 flex min-h-12 items-center justify-between gap-3 border-y border-white/[0.07] py-3">
          <span className="text-xs text-[#cdbd98]/72">
            {isPersian ? "قیمت نهایی" : "Final price"}
          </span>

          <ProductCardLivePrice
            slug={product.slug}
            locale={locale}
            initialPriceToman={product.displayPriceToman}
          />
        </div>

        <Link
          href={href}
          className={[
            "group/button relative mt-4 flex min-h-12 w-full items-center justify-between overflow-hidden rounded-full border py-1.5 pe-1.5 ps-5 text-sm font-medium transition duration-400 hover:-translate-y-0.5",
            isGold
              ? "border-[#d9b85f]/42 bg-[linear-gradient(100deg,rgba(96,69,17,0.16),rgba(222,187,91,0.22),rgba(96,69,17,0.16))] text-[#f5e5b8] hover:border-[#f0d681]/78"
              : "border-[#cedadd]/30 bg-[linear-gradient(100deg,rgba(97,112,117,0.09),rgba(214,225,229,0.13),rgba(97,112,117,0.09))] text-[#e4ebed] hover:border-[#e4edf0]/58",
          ].join(" ")}
        >
          <span>
            {isPersian ? "مشاهده جزئیات" : "View details"}
          </span>

          <span
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border",
              isGold
                ? "border-[#ead07e]/38 bg-[#d4b258]/10"
                : "border-[#dce6e9]/28 bg-[#dce6e9]/[0.07]",
            ].join(" ")}
          >
            <MagicArrowIcon
              className={[
                "h-[18px] w-[18px] transition-transform duration-400",
                isGold ? "text-[#e6c978]" : "text-[#dce6e9]",
                isPersian
                  ? "rotate-180 group-hover/button:-translate-x-1"
                  : "group-hover/button:translate-x-1",
              ].join(" ")}
            />
          </span>
        </Link>
      </div>
      </article>
    </InteractiveTiltCard>
  );
}
