import Image from "next/image";
import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  setRequestLocale,
} from "next-intl/server";

import {
  InternalPageShell,
} from "@/components/internal-page-shell";

import {
  BraceletRuneIcon,
  EarringRuneIcon,
  MagicArrowIcon,
  NecklaceRuneIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";

import {
  GoldRuneIcon,
  SilverRuneIcon,
} from "@/components/material-rune-icons";

type CollectionPageProps = {
  params: Promise<{
    locale: string;
    collection: string;
  }>;
};

type CollectionSlug =
  | "necklaces"
  | "bracelets"
  | "earrings";

const collectionContent = {
  necklaces: {
    image:
      "/images/collections/necklaces.jfif",

    eyebrow:
      "Eloria Necklace Collection",

    fa: {
      title:
        "گنجینه گردنبندها",

      subtitle:
        "روایت‌هایی نزدیک به قلب",

      description:
        "گردنبندهای الوریا با الهام از شکوه ایران کهن، نمادها و افسانه‌هایی طراحی شده‌اند که نزدیک‌ترین جایگاه را به قلب دارند.",

      story:
        "هر گردنبند، نشانی از یک خاطره، یک پیمان یا یک افسانه ماندگار است؛ قطعه‌ای که تنها یک جواهر نیست، بلکه بخشی از داستان صاحب خود خواهد شد.",
    },

    en: {
      title:
        "Necklace Collection",

      subtitle:
        "Stories Worn Close to the Heart",

      description:
        "Eloria necklaces draw inspiration from ancient Iranian grandeur, symbols and legends designed to remain close to the heart.",

      story:
        "Each necklace represents a memory, a promise or an enduring legend—more than an ornament, it becomes part of its owner’s story.",
    },
  },

  bracelets: {
    image:
      "/images/collections/bracelet.jpg",

    eyebrow:
      "Eloria Bracelet Collection",

    fa: {
      title:
        "گنجینه دستبندها",

      subtitle:
        "حلقه‌ای از قدرت و ظرافت",

      description:
        "دستبندهای الوریا پیوندی میان استحکام، ظرافت و نشانه‌های ماندگار جهان باستان هستند؛ آثاری که حضورشان آرام اما فراموش‌نشدنی است.",

      story:
        "دایره دستبند نمادی از تداوم و پیوند است؛ روایتی که آغاز و پایان ندارد و همراه صاحب خود در گذر زمان باقی می‌ماند.",
    },

    en: {
      title:
        "Bracelet Collection",

      subtitle:
        "A Circle of Strength and Elegance",

      description:
        "Eloria bracelets unite strength, refinement and enduring symbols of the ancient world in pieces with a quiet but unforgettable presence.",

      story:
        "The circle of a bracelet symbolizes continuity and connection—a story without beginning or end, carried through time by its owner.",
    },
  },

  earrings: {
    image:
      "/images/collections/earring.jpg",

    eyebrow:
      "Eloria Earring Collection",

    fa: {
      title:
        "گنجینه گوشواره‌ها",

      subtitle:
        "درخششی از جهان اسرارآمیز",

      description:
        "گوشواره‌های الوریا با فرم‌هایی ظریف و نمادین، از نور، معماری و افسانه‌های ایران کهن الهام گرفته‌اند.",

      story:
        "این آثار برای آنانی ساخته شده‌اند که می‌خواهند درخشش خود را نه با هیاهو، بلکه با جزئیاتی اصیل و معنادار آشکار کنند.",
    },

    en: {
      title:
        "Earring Collection",

      subtitle:
        "Radiance from a Mysterious World",

      description:
        "Eloria earrings use delicate symbolic forms inspired by light, architecture and the legends of ancient Iran.",

      story:
        "These pieces are created for those who reveal their radiance not through excess, but through authentic and meaningful detail.",
    },
  },
} as const;

function isCollectionSlug(
  value: string,
): value is CollectionSlug {
  return (
    value === "necklaces" ||
    value === "bracelets" ||
    value === "earrings"
  );
}

function CollectionRune({
  collection,
  className,
}: {
  collection: CollectionSlug;
  className?: string;
}) {
  if (
    collection ===
    "bracelets"
  ) {
    return (
      <BraceletRuneIcon
        className={className}
      />
    );
  }

  if (
    collection ===
    "earrings"
  ) {
    return (
      <EarringRuneIcon
        className={className}
      />
    );
  }

  return (
    <NecklaceRuneIcon
      className={className}
    />
  );
}

export default async function CollectionPage({
  params,
}: CollectionPageProps) {
  const {
    locale,
    collection,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  if (
    !isCollectionSlug(
      collection,
    )
  ) {
    notFound();
  }

  setRequestLocale(
    locale,
  );

  const isPersian =
    locale === "fa";

  const selectedCollection =
    collectionContent[
      collection
    ];

  const content =
    selectedCollection[
      isPersian
        ? "fa"
        : "en"
    ];

  return (
    <InternalPageShell
      locale={locale}
    >
      <section className="relative z-10 mx-auto w-full max-w-[1500px] px-4 pb-28 pt-[126px] sm:px-6 sm:pt-[138px] lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/${locale}/collections`}
            className="group flex items-center gap-3 rounded-full border border-[#d9b85f]/32 bg-[#061f17]/80 py-1.5 pe-4 ps-1.5 text-[11px] text-[#e5d19a] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#efd17d]/65"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9b85f]/25">
              <WorldRuneIcon className="h-5 w-5" />
            </span>

            <span>
              {isPersian
                ? "بازگشت به گنجینه‌ها"
                : "Back to collections"}
            </span>
          </Link>

          <Link
            href={`/${locale}/products?collection=${collection}`}
            className="rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[10px] text-white/45 backdrop-blur-xl transition hover:border-[#d9b85f]/28 hover:text-[#ead699]"
          >
            {isPersian
              ? "مشاهده تمام محصولات این گنجینه"
              : "View all products in this collection"}
          </Link>
        </div>

        <div className="mt-8 grid items-stretch gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(380px,0.92fr)]">
          <div className="relative min-h-[520px] overflow-hidden rounded-[2.7rem] border border-[#d8b860]/24 bg-[#031811] shadow-[0_36px_110px_rgba(0,0,0,0.52)] sm:min-h-[640px]">
            <Image
              src={
                selectedCollection.image
              }
              alt={
                content.title
              }
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover transition duration-1000 hover:scale-[1.025]"
            />

            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(1,13,9,0.08),rgba(1,13,9,0.18)_45%,rgba(1,12,8,0.92))]" />

            <div className="absolute inset-x-0 bottom-0 p-6 sm:p-9">
              <div className="flex items-end justify-between gap-5">
                <div>
                  <p className="text-[9px] uppercase tracking-[0.38em] text-[#d8c184]/65">
                    {
                      selectedCollection.eyebrow
                    }
                  </p>

                  <p
                    className={[
                      "mt-3 text-[#f4e7c9]",

                      isPersian
                        ? `font-persian-title text-2xl font-semibold leading-[1.9] sm:text-3xl`
                        : "text-2xl font-semibold sm:text-3xl",
                    ].join(" ")}
                  >
                    {
                      content.subtitle
                    }
                  </p>
                </div>

                <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[#efd17a]/42 bg-[#4b3810]/42 text-[#efd17a] backdrop-blur-xl sm:h-20 sm:w-20">
                  <span className="absolute inset-[6px] rounded-full border border-dashed border-current opacity-25" />

                  <CollectionRune
                    collection={
                      collection
                    }
                    className="relative h-8 w-8 sm:h-10 sm:w-10"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center rounded-[2.7rem] border border-[#d8b860]/22 bg-[linear-gradient(145deg,rgba(7,34,25,0.92),rgba(2,20,14,0.97))] p-6 shadow-[0_32px_95px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-9 lg:p-10">
            <div className="flex items-center gap-4">
              <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#d3b35b]/58" />

              <CollectionRune
                collection={
                  collection
                }
                className="h-7 w-7 text-[#e2c675]"
              />

              <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#d3b35b]/58" />
            </div>

            <p className="mt-7 text-center text-[9px] uppercase tracking-[0.42em] text-[#cfb66f]/60">
              {
                selectedCollection.eyebrow
              }
            </p>

            <h1
              className={[
                "mt-3 text-center text-[#f6e8c6]",

                isPersian
                  ? `font-persian-title pb-3 text-4xl font-semibold leading-[1.9] sm:text-5xl`
                  : "text-4xl font-semibold leading-tight sm:text-5xl",
              ].join(" ")}
            >
              {content.title}
            </h1>

            <p className="mt-3 text-center text-sm leading-8 text-[#d7c9aa]/72">
              {content.description}
            </p>

            <div className="my-7 h-px bg-gradient-to-r from-transparent via-[#d5b65f]/25 to-transparent" />

            <p className="text-center text-xs leading-8 text-[#cbbd9d]/62 sm:text-sm">
              {content.story}
            </p>

            <div className="mt-9 grid gap-3">
              <Link
                href={`/${locale}/collections/${collection}/gold`}
                className="group flex min-h-16 items-center justify-between rounded-full border border-[#d9b85f]/48 bg-[linear-gradient(100deg,rgba(95,67,15,0.2),rgba(221,184,81,0.25),rgba(95,67,15,0.2))] py-2 pe-2 ps-5 text-xs text-[#f5e2a7] transition hover:-translate-y-0.5 hover:border-[#efd27d]/85 hover:shadow-[0_0_30px_rgba(217,181,84,0.13)]"
              >
                <span className="flex items-center gap-3">
                  <GoldRuneIcon className="h-7 w-7" />

                  <span>
                    {isPersian
                      ? "ورود به گنجینه طلا"
                      : "Enter Gold Collection"}
                  </span>
                </span>

                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#efd17a]/35 bg-[#d5b258]/10">
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
                href={`/${locale}/collections/${collection}/silver`}
                className="group flex min-h-16 items-center justify-between rounded-full border border-[#d7e1e4]/30 bg-[linear-gradient(100deg,rgba(95,110,116,0.1),rgba(214,225,229,0.14),rgba(95,110,116,0.1))] py-2 pe-2 ps-5 text-xs text-[#e1e9eb] transition hover:-translate-y-0.5 hover:border-[#e1eaed]/60 hover:shadow-[0_0_30px_rgba(216,228,232,0.08)]"
              >
                <span className="flex items-center gap-3">
                  <SilverRuneIcon className="h-7 w-7" />

                  <span>
                    {isPersian
                      ? "ورود به گنجینه نقره"
                      : "Enter Silver Collection"}
                  </span>
                </span>

                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-[#dce6e9]/28 bg-[#dce6e9]/[0.06]">
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
        </div>
      </section>
    </InternalPageShell>
  );
}