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

import {
  AmbientEffects,
} from "@/components/ambient-effects";

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

import {
  SiteHeader,
} from "@/components/site-header";

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

type CollectionsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const collections = [
  {
    slug: "necklaces",

    image:
      "/images/collections/necklaces.jfif",

    fa: {
      title: "گردنبند",

      description:
        "روایت‌هایی آویخته از طلا، نقره، اصالت و افسانه",
    },

    en: {
      title: "Necklaces",

      description:
        "Stories suspended in gold, silver, heritage and legend",
    },

    Icon:
      NecklaceRuneIcon,
  },

  {
    slug: "bracelets",

    image:
      "/images/collections/bracelet.jpg",

    fa: {
      title: "دستبند",

      description:
        "نقش‌هایی از شکوه، ظرافت و میراث ماندگار الوریا",
    },

    en: {
      title: "Bracelets",

      description:
        "Symbols of elegance, grace and enduring Eloria heritage",
    },

    Icon:
      BraceletRuneIcon,
  },

  {
    slug: "earrings",

    image:
      "/images/collections/earring.jpg",

    fa: {
      title: "گوشواره",

      description:
        "درخشش‌هایی الهام‌گرفته از جهان اسرارآمیز الوریا",
    },

    en: {
      title: "Earrings",

      description:
        "Radiance inspired by the mysterious world of Eloria",
    },

    Icon:
      EarringRuneIcon,
  },
] as const;

export default async function CollectionsPage({
  params,
}: CollectionsPageProps) {
  const { locale } =
    await params;

  setRequestLocale(locale);

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  const isPersian =
    locale === "fa";

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

      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-28 pt-36 sm:px-6 lg:px-10 lg:pt-40">
        <header className="mx-auto max-w-4xl text-center">
          <p className="text-[10px] uppercase tracking-[0.45em] text-[#cfb66f]/65 sm:text-xs">
            Eloria Collections
          </p>

          <h1
            className={[
              "mt-4 text-[#f6e8c6]",
              isPersian
                ? `${persianTitleFont.className} pb-5 text-4xl font-semibold leading-[1.9] sm:text-5xl lg:text-6xl`
                : "text-4xl font-semibold sm:text-5xl lg:text-6xl",
            ].join(" ")}
          >
            {isPersian
              ? "هر قطعه، روایتی ماندگار"
              : "Every Piece, an Enduring Story"}
          </h1>

          <Link
            href={`/${locale}/products`}
            className="group mx-auto mt-3 flex w-fit items-center gap-3 rounded-full border border-[#d9b85f]/35 bg-[#061f17]/75 py-2 pe-3 ps-5 text-xs text-[#e8d39a] transition hover:-translate-y-0.5 hover:border-[#efd17d]/68 hover:text-[#fff0c4] hover:shadow-[0_0_28px_rgba(218,183,91,0.11)]"
          >
            <span>
              {isPersian
                ? "مشاهده تمام محصولات"
                : "View all products"}
            </span>

            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9b85f]/28 bg-[#d9b85f]/[0.06]">
              <AllProductsRuneIcon className="h-5 w-5" />
            </span>
          </Link>
        </header>

        <div className="mt-14 grid gap-8 lg:grid-cols-3">
          {collections.map(
            (
              collection,
              index,
            ) => {
              const content =
                collection[
                  isPersian
                    ? "fa"
                    : "en"
                ];

              const Icon =
                collection.Icon;

              return (
                <article
                  id={
                    collection.slug
                  }
                  key={
                    collection.slug
                  }
                  className="group relative scroll-mt-36 overflow-hidden rounded-[2.2rem] border border-[#d8b860]/20 bg-[linear-gradient(145deg,rgba(7,34,25,0.97),rgba(2,20,14,0.99))] p-3 shadow-[0_30px_85px_rgba(0,0,0,0.43)] transition duration-700 hover:-translate-y-2 hover:border-[#e8cc78]/55 hover:shadow-[0_38px_110px_rgba(0,0,0,0.56),0_0_38px_rgba(216,184,96,0.1)]"
                >
                  <div className="relative aspect-[4/5] overflow-hidden rounded-[1.75rem] border border-white/[0.06] bg-[#031811]">
                    <Image
                      src={
                        collection.image
                      }
                      alt={
                        content.title
                      }
                      fill
                      loading={
                        index === 0
                          ? "eager"
                          : "lazy"
                      }
                      fetchPriority={
                        index === 0
                          ? "high"
                          : "auto"
                      }
                      sizes="(max-width: 1024px) 100vw, 33vw"
                      className="object-cover transition duration-1000 group-hover:scale-[1.055]"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#01120c]/92 via-transparent to-black/10" />

                    <div className="absolute inset-x-0 bottom-0 flex justify-center pb-5">
                      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-[#efd17a]/40 bg-[#052218]/85 backdrop-blur-xl">
                        <span className="absolute inset-[5px] rounded-full border border-dashed border-[#e7ca76]/22" />

                        <Icon className="relative h-7 w-7 text-[#e3c574]" />
                      </div>
                    </div>
                  </div>

                  <div className="px-3 pb-3 pt-6 text-center">
                    <h2 className="text-2xl font-medium text-[#f4e8cc]">
                      {content.title}
                    </h2>

                    <p className="mx-auto mt-3 min-h-14 max-w-sm text-sm leading-7 text-[#cbbd9d]/70">
                      {content.description}
                    </p>

                    <div className="mt-6 grid gap-3">
                      <Link
                        href={`/${locale}/collections/${collection.slug}/gold`}
                        className="group/gold relative flex min-h-14 items-center justify-between overflow-hidden rounded-full border border-[#d9b85f]/48 bg-[linear-gradient(100deg,rgba(95,67,15,0.2),rgba(221,184,81,0.27),rgba(95,67,15,0.2))] py-2 pe-2 ps-5 text-xs text-[#f5e2a7] transition hover:-translate-y-0.5 hover:border-[#efd27d]/85 hover:shadow-[0_0_28px_rgba(217,181,84,0.14)]"
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
                              isPersian
                                ? "rotate-180"
                                : "",
                            ].join(" ")}
                          />
                        </span>
                      </Link>

                      <Link
                        href={`/${locale}/collections/${collection.slug}/silver`}
                        className="group/silver relative flex min-h-14 items-center justify-between overflow-hidden rounded-full border border-[#d7e1e4]/30 bg-[linear-gradient(100deg,rgba(95,110,116,0.1),rgba(214,225,229,0.15),rgba(95,110,116,0.1))] py-2 pe-2 ps-5 text-xs text-[#e1e9eb] transition hover:-translate-y-0.5 hover:border-[#e1eaed]/60 hover:shadow-[0_0_28px_rgba(216,228,232,0.09)]"
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
                              isPersian
                                ? "rotate-180"
                                : "",
                            ].join(" ")}
                          />
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            },
          )}
        </div>
      </section>
    </main>
  );
}