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
  Crown,
  Gem,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import {
  InternalPageShell,
} from "@/components/internal-page-shell";

import {
  MagicArrowIcon,
  WorldRuneIcon,
} from "@/components/luxury-icons";

const persianTitleFont =
  Noto_Nastaliq_Urdu({
    subsets: [
      "arabic",
    ],

    weight: [
      "400",
      "500",
      "600",
      "700",
    ],

    display:
      "swap",
  });

type AboutPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const principles = [
  {
    icon:
      Crown,

    fa: {
      title:
        "شکوه ماندگار",

      description:
        "طراحی آثاری که از مدهای زودگذر عبور می‌کنند و هویت خود را در گذر زمان حفظ می‌کنند.",
    },

    en: {
      title:
        "Enduring Grandeur",

      description:
        "Creating pieces that transcend temporary trends and preserve their identity through time.",
    },
  },

  {
    icon:
      Gem,

    fa: {
      title:
        "جزئیات اصیل",

      description:
        "هر فرم، نقش و پرداخت با هدفی مشخص انتخاب می‌شود تا هیچ جزئیاتی بی‌معنا نباشد.",
    },

    en: {
      title:
        "Authentic Detail",

      description:
        "Every form, symbol and finish is selected intentionally, leaving no detail without meaning.",
    },
  },

  {
    icon:
      ScrollText,

    fa: {
      title:
        "روایت پنهان",

      description:
        "هر قطعه از الــوریا حامل داستانی است که با حضور صاحب آن کامل می‌شود.",
    },

    en: {
      title:
        "Hidden Narrative",

      description:
        "Every Eloria piece carries a story completed through the presence of its owner.",
    },
  },

  {
    icon:
      ShieldCheck,

    fa: {
      title:
        "اعتماد و شفافیت",

      description:
        "قیمت، مشخصات، وزن و اطلاعات هر اثر با ساختاری روشن و قابل بررسی ارائه می‌شود.",
    },

    en: {
      title:
        "Trust and Clarity",

      description:
        "The price, specifications, weight and details of every piece are presented transparently.",
    },
  },
] as const;

export default async function AboutPage({
  params,
}: AboutPageProps) {
  const {
    locale,
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

  return (
    <InternalPageShell
      locale={locale}
    >
      <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[132px] sm:px-6 sm:pt-[144px] lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href={`/${locale}`}
            className="group flex items-center gap-3 rounded-full border border-[#d9b85f]/32 bg-[#061f17]/80 py-1.5 pe-4 ps-1.5 text-[11px] text-[#e5d19a] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#efd17d]/65"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d9b85f]/25">
              <WorldRuneIcon className="h-5 w-5" />
            </span>

            <span>
              {isPersian
                ? "بازگشت به جهان الــوریا"
                : "Back to Eloria"}
            </span>
          </Link>

          <Link
            href={`/${locale}/collections`}
            className="rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2 text-[10px] text-white/45 backdrop-blur-xl transition hover:border-[#d9b85f]/28 hover:text-[#ead699]"
          >
            {isPersian
              ? "ورود به گنجینه‌ها"
              : "Explore collections"}
          </Link>
        </div>

        <header className="mx-auto mt-12 max-w-4xl text-center">
          <div className="mb-5 flex items-center justify-center gap-4">
            <span className="h-px w-16 bg-gradient-to-r from-transparent to-[#d3b35b]/65 sm:w-28" />

            <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-[#d9ba63]/38 bg-[radial-gradient(circle,rgba(211,176,85,0.15),rgba(4,29,21,0.9)_70%)] text-[#e7ca77]">
              <span className="absolute inset-[6px] rounded-full border border-dashed border-[#e0c26d]/22" />

              <Sparkles className="relative h-7 w-7" />
            </div>

            <span className="h-px w-16 bg-gradient-to-l from-transparent to-[#d3b35b]/65 sm:w-28" />
          </div>

          <p className="text-[9px] uppercase tracking-[0.46em] text-[#cfb66f]/60">
            The Story of Eloria
          </p>

          <h1
            className={[
              "mt-3 text-[#f6e8c6]",

              isPersian
                ? `${persianTitleFont.className} pb-5 text-4xl font-semibold leading-[1.95] sm:text-5xl lg:text-6xl`
                : "text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl",
            ].join(" ")}
          >
            {isPersian
              ? "داستان الــوریا"
              : "The Story of Eloria"}
          </h1>

          <p className="mx-auto max-w-3xl text-sm leading-9 text-[#d8caaa]/70 sm:text-base">
            {isPersian
              ? "الــوریا از پیوند میان هنر جواهرسازی، شکوه ایران کهن و روایت‌های فراموش‌نشدنی شکل گرفته است؛ جهانی که در آن هر قطعه تنها یک زیور نیست، بلکه نشانی از هویت، خاطره و افسانه است."
              : "Eloria was born from the union of jewelry artistry, the grandeur of ancient Iran and unforgettable narratives—a world where every piece is more than an ornament, becoming a symbol of identity, memory and legend."}
          </p>
        </header>

        <div className="mt-14 grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <article className="relative overflow-hidden rounded-[2.6rem] border border-[#d8b860]/22 bg-[linear-gradient(145deg,rgba(7,34,25,0.94),rgba(2,20,14,0.98))] p-6 shadow-[0_32px_95px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:p-9">
            <div
              aria-hidden="true"
              className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#efd17a]/60 to-transparent"
            />

            <span className="text-[9px] uppercase tracking-[0.38em] text-[#d1ba79]/52">
              Eloria Philosophy
            </span>

            <h2
              className={[
                "mt-4 text-[#f0dfb7]",

                isPersian
                  ? `${persianTitleFont.className} text-3xl font-semibold leading-[1.9]`
                  : "text-3xl font-semibold",
              ].join(" ")}
            >
              {isPersian
                ? "زیوری برای روایت یک هویت"
                : "Jewelry That Carries Identity"}
            </h2>

            <p className="mt-5 text-sm leading-9 text-[#d5c7a8]/68">
              {isPersian
                ? "در الــوریا، طراحی از یک فرم زیبا آغاز نمی‌شود؛ از یک مفهوم آغاز می‌شود. نشانه‌ها، خطوط و نسبت‌ها با الهام از معماری، اسطوره‌ها، طبیعت و هنر ایران انتخاب می‌شوند و سپس در قالب اثری معاصر جان می‌گیرند."
                : "At Eloria, design does not begin with a beautiful form; it begins with an idea. Symbols, lines and proportions draw inspiration from Iranian architecture, mythology, nature and art before taking shape as a contemporary piece."}
            </p>

            <p className="mt-4 text-sm leading-9 text-[#c9bb9d]/58">
              {isPersian
                ? "هدف، بازسازی مستقیم گذشته نیست؛ هدف ساختن آثاری است که ریشه در گذشته دارند اما برای زندگی امروز طراحی شده‌اند."
                : "The purpose is not to reproduce the past directly, but to create pieces rooted in history and designed for life today."}
            </p>

            <Link
              href={`/${locale}/collections`}
              className="group mt-8 flex w-fit items-center gap-3 rounded-full border border-[#d9b85f]/38 bg-[#d9b85f]/[0.055] py-2 pe-2 ps-5 text-xs text-[#ecd794] transition hover:-translate-y-0.5 hover:border-[#efd17d]/72"
            >
              <span>
                {isPersian
                  ? "تماشای گنجینه‌ها"
                  : "Discover the collections"}
              </span>

              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#efd17a]/30">
                <MagicArrowIcon
                  className={[
                    "h-4 w-4",

                    isPersian
                      ? "rotate-180"
                      : "",
                  ].join(" ")}
                />
              </span>
            </Link>
          </article>

          <div className="grid gap-4 sm:grid-cols-2">
            {principles.map(
              (
                principle,
              ) => {
                const Icon =
                  principle.icon;

                const content =
                  principle[
                    isPersian
                      ? "fa"
                      : "en"
                  ];

                return (
                  <article
                    key={
                      principle.en.title
                    }
                    className="group rounded-[2rem] border border-white/[0.075] bg-[#061c15]/76 p-5 shadow-[0_24px_65px_rgba(0,0,0,0.3)] backdrop-blur-xl transition duration-500 hover:-translate-y-1 hover:border-[#d9b85f]/28 sm:p-6"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d9b85f]/24 bg-[#d9b85f]/[0.05] text-[#dfc26e] transition group-hover:border-[#efd17a]/45">
                      <Icon className="h-6 w-6" />
                    </div>

                    <h2 className="mt-5 text-lg font-medium text-[#eee1c7]">
                      {content.title}
                    </h2>

                    <p className="mt-3 text-xs leading-7 text-[#cbbd9d]/60">
                      {content.description}
                    </p>
                  </article>
                );
              },
            )}
          </div>
        </div>

        <article className="relative mt-8 overflow-hidden rounded-[2.5rem] border border-[#d9b85f]/22 bg-[linear-gradient(135deg,rgba(9,40,30,0.92),rgba(2,20,14,0.98))] px-6 py-10 text-center shadow-[0_30px_90px_rgba(0,0,0,0.4)] backdrop-blur-xl sm:px-10">
          <div
            aria-hidden="true"
            className="absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-[#efd17a]/65 to-transparent"
          />

          <p className="text-[9px] uppercase tracking-[0.4em] text-[#d1ba78]/50">
            A Legend to Carry
          </p>

          <h2
            className={[
              "mt-4 text-[#f3e2bb]",

              isPersian
                ? `${persianTitleFont.className} text-3xl font-semibold leading-[1.9] sm:text-4xl`
                : "text-3xl font-semibold sm:text-4xl",
            ].join(" ")}
          >
            {isPersian
              ? "هر قطعه، آغاز یک افسانه تازه"
              : "Every Piece Begins a New Legend"}
          </h2>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-8 text-[#d3c5a7]/65">
            {isPersian
              ? "افسانه الــوریا با ساخت یک اثر پایان نمی‌یابد؛ از لحظه‌ای که آن اثر انتخاب می‌شود، روایت تازه‌ای با صاحب آن آغاز خواهد شد."
              : "An Eloria legend does not end when a piece is created. From the moment it is chosen, a new story begins with its owner."}
          </p>
        </article>
      </section>
    </InternalPageShell>
  );
}