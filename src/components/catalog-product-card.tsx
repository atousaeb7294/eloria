import Image from "next/image";
import Link from "next/link";

import {
  MagicArrowIcon,
} from "@/components/luxury-icons";

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

const collectionNames: Record<
  string,
  {
    fa: string;
    en: string;
  }
> = {
  necklaces: {
    fa: "گردنبند",
    en: "Necklaces",
  },

  bracelets: {
    fa: "دستبند",
    en: "Bracelets",
  },

  earrings: {
    fa: "گوشواره",
    en: "Earrings",
  },
};

export function CatalogProductCard({
  product,
  locale,
  eager = false,
  showCollection = true,
}: CatalogProductCardProps) {
  const isPersian =
    locale === "fa";

  const isGold =
    product.material ===
    "GOLD";

  const productName =
    isPersian
      ? product.nameFa
      : product.nameEn;

  const imageAlt =
    isPersian
      ? product.image
          ?.altFa ??
        product.nameFa
      : product.image
          ?.altEn ??
        product.nameEn;

  const materialLabel =
    isGold
      ? isPersian
        ? "طلا"
        : "Gold"
      : isPersian
        ? "نقره"
        : "Silver";

  const collectionName =
    collectionNames[
      product.collectionSlug
    ]?.[
      isPersian
        ? "fa"
        : "en"
    ] ??
    product.collectionSlug;

  const imageUrl =
    product.image
      ?.imageUrl ??
    fallbackImages[
      product.collectionSlug
    ] ??
    "/images/collections/necklaces.jfif";

  const MaterialIcon =
    isGold
      ? GoldRuneIcon
      : SilverRuneIcon;

  return (
    <article
      className={[
        "group relative overflow-hidden rounded-[2.15rem] border bg-[linear-gradient(145deg,rgba(7,34,25,0.97),rgba(2,20,14,0.99))] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.42)] transition duration-700 hover:-translate-y-2",
        isGold
          ? "border-[#d8b860]/22 hover:border-[#e8cc78]/58 hover:shadow-[0_38px_110px_rgba(0,0,0,0.56),0_0_42px_rgba(216,184,96,0.12)]"
          : "border-[#c5d2d7]/20 hover:border-[#dbe5e8]/48 hover:shadow-[0_38px_110px_rgba(0,0,0,0.56),0_0_42px_rgba(210,225,230,0.09)]",
      ].join(" ")}
    >
      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent",
          isGold
            ? "via-[#f0d98d]/65"
            : "via-[#e4edf0]/50",
        ].join(" ")}
      />

      <div
        aria-hidden="true"
        className={[
          "pointer-events-none absolute -right-24 -top-24 h-52 w-52 rounded-full blur-3xl transition duration-700",
          isGold
            ? "bg-[#d9b85f]/[0.045] group-hover:bg-[#d9b85f]/[0.08]"
            : "bg-[#dce6e9]/[0.035] group-hover:bg-[#dce6e9]/[0.065]",
        ].join(" ")}
      />

      <div className="relative aspect-[4/5] overflow-hidden rounded-[1.7rem] border border-white/[0.06] bg-[#031811]">
        <Image
          src={imageUrl}
          alt={imageAlt}
          fill
          loading={
            eager
              ? "eager"
              : "lazy"
          }
          fetchPriority={
            eager
              ? "high"
              : "auto"
          }
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-1000 ease-out group-hover:scale-[1.055]"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#01120c]/90 via-transparent to-black/10"
        />

        <div
          aria-hidden="true"
          className="absolute inset-0 shadow-[inset_0_0_85px_rgba(0,0,0,0.32)]"
        />

        <div className="absolute start-4 top-4">
          <div
            className={[
              "flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] backdrop-blur-xl",
              isGold
                ? "border-[#e3c775]/35 bg-[#4c3a12]/45 text-[#f1d98f]"
                : "border-[#d8e1e4]/30 bg-[#526268]/30 text-[#e2eaed]",
            ].join(" ")}
          >
            <MaterialIcon className="h-4 w-4" />

            <span>
              {materialLabel}
            </span>
          </div>
        </div>

        {!product.isAvailable && (
          <div className="absolute end-4 top-4 rounded-full border border-rose-200/20 bg-[#3f1118]/70 px-3 py-1.5 text-[10px] text-rose-100 backdrop-blur-xl">
            {isPersian
              ? "ناموجود"
              : "Out of stock"}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 flex justify-center pb-5">
          <div
            className={[
              "relative flex h-12 w-12 items-center justify-center rounded-full border bg-[#052218]/85 shadow-[0_8px_28px_rgba(0,0,0,0.34)] backdrop-blur-xl",
              isGold
                ? "border-[#efd17a]/40 text-[#e3c574]"
                : "border-[#d7e1e5]/35 text-[#dce7ea]",
            ].join(" ")}
          >
            <span
              aria-hidden="true"
              className="absolute inset-[4px] rounded-full border border-dashed border-current opacity-20"
            />

            <MaterialIcon className="relative h-6 w-6" />
          </div>
        </div>
      </div>

      <div className="px-3 pb-3 pt-6">
        <h2 className="min-h-16 text-xl font-medium leading-8 text-[#f4e8cc]">
          {productName}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#d2bd83]">
          <span
            className={[
              "relative flex h-9 w-9 items-center justify-center rounded-xl border",
              isGold
                ? "border-[#d8b860]/30 bg-[#d8b860]/[0.055] text-[#d9bd6c]"
                : "border-[#d6e0e4]/25 bg-[#d6e0e4]/[0.045] text-[#dbe5e8]",
            ].join(" ")}
          >
            <MaterialIcon className="h-[18px] w-[18px]" />
          </span>

          <span>
            {isPersian
              ? "جنس:"
              : "Material:"}
          </span>

          <strong
            className={[
              "font-medium",
              isGold
                ? "text-[#f0da99]"
                : "text-[#e2eaec]",
            ].join(" ")}
          >
            {materialLabel}
          </strong>

          {showCollection && (
            <>
              <span className="text-white/20">
                •
              </span>

              <span className="text-[#bdb094]/65">
                {collectionName}
              </span>
            </>
          )}
        </div>

        <Link
          href={`/${locale}/products/${product.slug}`}
          className={[
            "group/button relative mt-7 flex min-h-14 w-full items-center justify-between overflow-hidden rounded-full border py-2 pe-2 ps-6 text-sm font-medium transition duration-500 hover:-translate-y-0.5",
            isGold
              ? "border-[#d9b85f]/45 bg-[linear-gradient(100deg,rgba(96,69,17,0.18),rgba(222,187,91,0.24),rgba(96,69,17,0.18))] text-[#f5e5b8] hover:border-[#f0d681]/85 hover:text-[#fff0c3] hover:shadow-[0_0_32px_rgba(218,183,91,0.15)]"
              : "border-[#cedadd]/32 bg-[linear-gradient(100deg,rgba(97,112,117,0.1),rgba(214,225,229,0.14),rgba(97,112,117,0.1))] text-[#e4ebed] hover:border-[#e4edf0]/62 hover:text-white hover:shadow-[0_0_32px_rgba(215,228,232,0.1)]",
          ].join(" ")}
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 translate-x-full bg-[linear-gradient(110deg,transparent_25%,rgba(255,255,255,0.12)_50%,transparent_75%)] transition-transform duration-1000 group-hover/button:-translate-x-full"
          />

          <span className="relative">
            {isPersian
              ? "مشاهده مشخصات"
              : "View Details"}
          </span>

          <span
            className={[
              "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full border",
              isGold
                ? "border-[#ead07e]/40 bg-[#d4b258]/10"
                : "border-[#dce6e9]/30 bg-[#dce6e9]/[0.07]",
            ].join(" ")}
          >
            <MagicArrowIcon
              className={[
                "h-[18px] w-[18px] transition-transform duration-500",
                isGold
                  ? "text-[#e6c978]"
                  : "text-[#dce6e9]",
                isPersian
                  ? "rotate-180 group-hover/button:-translate-x-1"
                  : "group-hover/button:translate-x-1",
              ].join(" ")}
            />
          </span>
        </Link>
      </div>
    </article>
  );
}