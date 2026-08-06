import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { InteractiveTiltCard } from "@/components/interactive-tilt-card";
import { InternalPageShell } from "@/components/internal-page-shell";
import {
  BraceletRuneIcon,
  EarringRuneIcon,
  MagicArrowIcon,
  NecklaceRuneIcon,
} from "@/components/luxury-icons";
import {
  AllProductsRuneIcon,
  GoldRuneIcon,
  SilverRuneIcon,
} from "@/components/material-rune-icons";
import { getActiveCatalogCollections } from "@/lib/catalog";

type CollectionsPageProps = {
  params: Promise<{ locale: string }>;
};

type CollectionCard = {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  imageUrl: string;
  productCount: number | null;
};

export const revalidate = 300;

const fallbackCollections: CollectionCard[] = [
  {
    id: "fallback-necklaces",
    slug: "necklaces",
    nameFa: "گردنبند",
    nameEn: "Necklaces",
    imageUrl: "/images/collections/necklaces.jfif",
    productCount: null,
  },
  {
    id: "fallback-bracelets",
    slug: "bracelets",
    nameFa: "دستبند",
    nameEn: "Bracelets",
    imageUrl: "/images/collections/bracelet.jpg",
    productCount: null,
  },
  {
    id: "fallback-earrings",
    slug: "earrings",
    nameFa: "گوشواره",
    nameEn: "Earrings",
    imageUrl: "/images/collections/earring.jpg",
    productCount: null,
  },
];

const descriptions = {
  necklaces: {
    fa: "روایت‌هایی آویخته از طلا، نقره، اصالت و افسانه",
    en: "Stories suspended in gold, silver, heritage and legend",
  },
  bracelets: {
    fa: "نقش‌هایی از شکوه، ظرافت و میراث ماندگار الوریا",
    en: "Symbols of elegance, grace and enduring Eloria heritage",
  },
  earrings: {
    fa: "درخشش‌هایی الهام‌گرفته از جهان اسرارآمیز الوریا",
    en: "Radiance inspired by the mysterious world of Eloria",
  },
} as const;

function iconForCollection(slug: string) {
  if (slug === "necklaces") return NecklaceRuneIcon;
  if (slug === "bracelets") return BraceletRuneIcon;
  if (slug === "earrings") return EarringRuneIcon;
  return AllProductsRuneIcon;
}

function fallbackImageForCollection(slug: string) {
  if (slug === "necklaces") return "/images/collections/necklaces.jfif";
  if (slug === "bracelets") return "/images/collections/bracelet.jpg";
  if (slug === "earrings") return "/images/collections/earring.jpg";
  return "/images/hero/eloria-hero.jpeg";
}

function descriptionForCollection(
  slug: string,
  isPersian: boolean,
  productCount: number | null,
) {
  const knownDescription = descriptions[slug as keyof typeof descriptions];

  if (knownDescription) {
    return isPersian ? knownDescription.fa : knownDescription.en;
  }

  if (productCount !== null) {
    return isPersian
      ? `${productCount.toLocaleString("fa-IR")} اثر در این گنجینه`
      : `${productCount.toLocaleString("en-US")} creations in this collection`;
  }

  return isPersian
    ? "جواهری از جهان اصیل و افسانه‌ای الوریا"
    : "A jewel from Eloria's mythical world";
}

export default async function CollectionsPage({ params }: CollectionsPageProps) {
  const { locale } = await params;

  if (locale !== "fa" && locale !== "en") {
    notFound();
  }

  setRequestLocale(locale);

  const isPersian = locale === "fa";
  let collections: CollectionCard[] = fallbackCollections;

  try {
    const catalogCollections = await getActiveCatalogCollections();

    if (catalogCollections.length > 0) {
      collections = catalogCollections.map((collection) => ({
        id: collection.id,
        slug: collection.slug,
        nameFa: collection.nameFa,
        nameEn: collection.nameEn,
        imageUrl:
          collection.imageUrl || fallbackImageForCollection(collection.slug),
        productCount: collection.productCount,
      }));
    }
  } catch (error) {
    console.error(
      "[Eloria Collections] Database unavailable; using visual fallback collections.",
      error,
    );
  }

  return (
    <InternalPageShell locale={locale}>
      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-28 pt-36 sm:px-6 lg:px-10 lg:pt-40">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-[10px] uppercase tracking-[0.45em] text-[#cfb66f]/65 sm:text-xs">
            Eloria Collections
          </p>

          <h1
            className={[
              "mt-4 text-[#f6e8c6]",
              isPersian
                ? "font-persian-title pb-5 text-4xl leading-[1.8] sm:text-5xl lg:text-6xl"
                : "text-4xl font-semibold sm:text-5xl lg:text-6xl",
            ].join(" ")}
          >
            {isPersian
              ? "گنجینه‌های جواهرات الوریا"
              : "Eloria Jewellery Collections"}
          </h1>

          <Link
            href={`/${locale}/products`}
            className="group mx-auto mt-3 flex w-fit items-center gap-3 rounded-full border border-[#d9b85f]/35 bg-[#061f17]/75 py-2 pe-3 ps-5 text-xs text-[#e8d39a] transition duration-300 hover:-translate-y-0.5 hover:border-[#efd17d]/68 hover:text-[#fff0c4] hover:shadow-[0_0_28px_rgba(218,183,91,0.11)]"
          >
            <span>{isPersian ? "مشاهده تمام آثار" : "View all creations"}</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9b85f]/28 bg-[#d9b85f]/[0.06]">
              <AllProductsRuneIcon className="h-5 w-5" />
            </span>
          </Link>
        </header>

        <div className="mt-14 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {collections.map((collection, index) => {
            const title = isPersian ? collection.nameFa : collection.nameEn;
            const description = descriptionForCollection(
              collection.slug,
              isPersian,
              collection.productCount,
            );
            const Icon = iconForCollection(collection.slug);

            return (
              <InteractiveTiltCard
                key={collection.id}
                maxTilt={4}
                lift={5}
                className="group scroll-mt-36 rounded-[2.2rem]"
              >
                <article
                  id={collection.slug}
                  className="relative scroll-mt-36 overflow-hidden rounded-[2.2rem] border border-[#d8b860]/20 bg-[linear-gradient(145deg,rgba(7,34,25,0.97),rgba(2,20,14,0.99))] p-3 shadow-[0_30px_85px_rgba(0,0,0,0.43)] transition-[border-color,box-shadow] duration-500 group-hover:border-[#e8cc78]/55 group-hover:shadow-[0_38px_100px_rgba(0,0,0,0.52),0_0_34px_rgba(216,184,96,0.1)]"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <div
                    className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[#031811]"
                    style={{ transform: "translateZ(20px)" }}
                  >
                    <Image
                      src={collection.imageUrl}
                      alt={title}
                      fill
                      loading={index === 0 ? "eager" : "lazy"}
                      fetchPriority={index === 0 ? "high" : "auto"}
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-[1.045]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#01120c]/94 via-[#01120c]/8 to-black/10" />

                    <div className="absolute inset-x-0 bottom-0 flex justify-center pb-5">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#efd17a]/40 bg-[#052218]/88 shadow-[0_0_24px_rgba(229,196,106,0.08)] backdrop-blur-md">
                        <span className="absolute inset-[5px] rounded-full border border-dashed border-[#e7ca76]/22" />
                        <Icon className="relative h-7 w-7 text-[#e3c574]" />
                      </div>
                    </div>
                  </div>

                  <div
                    className="px-3 pb-3 pt-6 text-center"
                    style={{ transform: "translateZ(28px)" }}
                  >
                    <h2
                      className={[
                        "text-2xl text-[#f4e8cc]",
                        isPersian
                          ? "font-persian-title pb-2 text-[2rem] leading-[1.75]"
                          : "font-medium",
                      ].join(" ")}
                    >
                      {title}
                    </h2>

                    <p className="mx-auto mt-3 min-h-14 max-w-sm text-sm leading-7 text-[#cbbd9d]/72">
                      {description}
                    </p>

                    <div className="mt-6 grid gap-3">
                      <Link
                        href={`/${locale}/collections/${collection.slug}/gold`}
                        className="group/gold relative flex min-h-14 items-center justify-between overflow-hidden rounded-full border border-[#d9b85f]/48 bg-[linear-gradient(100deg,rgba(95,67,15,0.2),rgba(221,184,81,0.27),rgba(95,67,15,0.2))] py-2 pe-2 ps-5 text-xs text-[#f5e2a7] transition duration-300 hover:-translate-y-0.5 hover:border-[#efd27d]/85 hover:shadow-[0_0_28px_rgba(217,181,84,0.14)]"
                      >
                        <span className="flex items-center gap-3">
                          <GoldRuneIcon className="h-6 w-6" />
                          <span>
                            {isPersian
                              ? "ورود به گنجینه طلا"
                              : "Enter Gold Collection"}
                          </span>
                        </span>

                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#efd17a]/35 bg-[#d5b258]/10">
                          <MagicArrowIcon
                            className={[
                              "h-4 w-4 text-[#e4c36d]",
                              isPersian ? "rotate-180" : "",
                            ].join(" ")}
                          />
                        </span>
                      </Link>

                      <Link
                        href={`/${locale}/collections/${collection.slug}/silver`}
                        className="group/silver relative flex min-h-14 items-center justify-between overflow-hidden rounded-full border border-[#d7e1e4]/30 bg-[linear-gradient(100deg,rgba(95,110,116,0.1),rgba(214,225,229,0.15),rgba(95,110,116,0.1))] py-2 pe-2 ps-5 text-xs text-[#e1e9eb] transition duration-300 hover:-translate-y-0.5 hover:border-[#e1eaed]/60 hover:shadow-[0_0_28px_rgba(216,228,232,0.09)]"
                      >
                        <span className="flex items-center gap-3">
                          <SilverRuneIcon className="h-6 w-6" />
                          <span>
                            {isPersian
                              ? "ورود به گنجینه نقره"
                              : "Enter Silver Collection"}
                          </span>
                        </span>

                        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#dce6e9]/28 bg-[#dce6e9]/[0.06]">
                          <MagicArrowIcon
                            className={[
                              "h-4 w-4 text-[#dce6e9]",
                              isPersian ? "rotate-180" : "",
                            ].join(" ")}
                          />
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              </InteractiveTiltCard>
            );
          })}
        </div>
      </section>
    </InternalPageShell>
  );
}
