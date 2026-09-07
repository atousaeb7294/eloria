import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import {
  ArrowUpLeft,
  BookOpenText,
  Gem,
  HeartHandshake,
  ScrollText,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";

type AboutPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: AboutPageProps): Promise<Metadata> {
  const { locale } = await params;
  const fa = locale !== "en";

  return {
    title: fa
      ? "درباره الوریا | اکسسوری دست‌ساز مکرومه، طلا، نقره و سنگ"
      : "About Eloria | Handmade Macramé, Gold, Silver and Gemstone Jewelry",
    description: fa
      ? "الوریا، برند زیورآلات دست‌ساز با بافت مکرومه، طلا، نقره و سنگ‌های زینتی است. با فلسفه طراحی، شیوه انتخاب و دنیای روایی برند آشنا شوید."
      : "Eloria creates handmade macramé jewelry with gold, silver and gemstones. Discover our design philosophy, considered choices and connected story world.",
    alternates: {
      canonical: `/${locale}/about`,
      languages: { fa: "/fa/about", en: "/en/about", "x-default": "/fa/about" },
    },
  };
}

export default async function AboutPage({ params }: AboutPageProps) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);
  const fa = locale === "fa";

  const principles = fa
    ? [
        {
          icon: Gem,
          title: "زیور دست‌ساز با هویت",
          body: "در الوریا، بافت مکرومه با قطعات طلا، نقره و سنگ‌های زینتی کنار هم می‌نشیند تا هر زیور، جزئی از سلیقه و خاطرهٔ شخصی صاحب آن باشد.",
        },
        {
          icon: ShieldCheck,
          title: "انتخاب آگاهانه و شفاف",
          body: "مشخصات، تصویر، جنس، وزن و جزئیات هر اثر به‌صورت روشن ارائه می‌شود تا انتخاب یک اکسسوری دست‌ساز، تجربه‌ای دقیق و قابل اعتماد باشد.",
        },
        {
          icon: HeartHandshake,
          title: "یادگاری برای ماندن",
          body: "ما زیورها را برای همراهی روزمره، هدیه‌دادن و ثبت لحظه‌های مهم طراحی می‌کنیم؛ آثاری که ارزش‌شان تنها به مادهٔ سازنده محدود نمی‌شود.",
        },
      ]
    : [
        {
          icon: Gem,
          title: "Handmade jewelry with identity",
          body: "Eloria brings macramé, gold, silver and gemstones together so every piece can become part of its owner’s taste and memory.",
        },
        {
          icon: ShieldCheck,
          title: "Considered, transparent choice",
          body: "Materials, imagery, weight and product details are presented clearly for a trustworthy choice of handmade jewelry.",
        },
        {
          icon: HeartHandshake,
          title: "Keepsakes made to remain",
          body: "We design for daily companionship, meaningful gifts and lasting moments—pieces whose value reaches beyond their materials.",
        },
      ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: fa ? "دربارهٔ الوریا" : "About Eloria",
    url: `https://eloriagallery.ir/${locale}/about`,
    mainEntity: {
      "@type": "Organization",
      name: "ELORIA",
      url: "https://eloriagallery.ir",
      description: fa
        ? "برند زیورآلات دست‌ساز مکرومه با طلا، نقره و سنگ‌های زینتی."
        : "A handmade macramé jewelry brand using gold, silver and gemstones.",
    },
  };

  return (
    <InternalPageShell locale={locale}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <main
        dir={fa ? "rtl" : "ltr"}
        className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[132px] sm:px-6 sm:pt-[144px] lg:px-10"
      >
        <header className="mx-auto max-w-4xl text-center">
          <div className="mx-auto grid size-16 place-items-center rounded-full border border-[#d9ba63]/38 bg-[radial-gradient(circle,rgba(211,176,85,0.15),rgba(4,29,21,0.9)_70%)] text-[#e7ca77]">
            <Sparkles className="size-7" />
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-[.42em] text-[#cfb66f]/60">
            About Eloria
          </p>
          <h1 className={`${fa ? "font-persian-title leading-[1.95]" : "font-semibold"} mt-3 text-4xl text-[#f6e8c6] sm:text-5xl lg:text-6xl`}>
            {fa ? "دربارهٔ الوریا" : "About Eloria"}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-9 text-[#d8caaa]/72 sm:text-base">
            {fa
              ? "الوریا برند زیورآلات دست‌ساز است؛ جایی که بافت مکرومه، طلا، نقره و سنگ‌های زینتی با دقت انتخاب می‌شوند تا هر قطعه به یادگاری شخصی و ماندگار تبدیل شود."
              : "Eloria is a handmade jewelry brand where macramé, gold, silver and gemstones are thoughtfully brought together as personal, lasting keepsakes."}
          </p>
        </header>

        <section className="mx-auto mt-14 max-w-6xl overflow-hidden rounded-[2.8rem] border border-[#d8b860]/22 bg-[linear-gradient(145deg,rgba(9,45,32,0.94),rgba(2,20,14,0.99))] px-6 py-10 shadow-[0_34px_100px_rgba(0,0,0,0.4)] sm:px-10 sm:py-14 lg:px-16">
          <div className="mx-auto max-w-4xl">
            <p className="text-[9px] uppercase tracking-[.4em] text-[#d3bb78]/58">
              Eloria Design Philosophy
            </p>
            <h2 className={`${fa ? "font-persian-title leading-[1.9]" : "font-semibold"} mt-4 text-3xl text-[#f2e1ba] sm:text-4xl`}>
              {fa ? "نگاه رسمی ما به طراحی و انتخاب" : "Our formal approach to design and choice"}
            </h2>
            <div className="mt-7 space-y-5 text-sm leading-9 text-[#d6c8aa]/72 sm:text-base">
              <p>
                {fa
                  ? "هر اثر الوریا از کنار هم قرار گرفتن متریال، رنگ، بافت و جزئیات ساخته می‌شود. مکرومه برای ما فقط یک تکنیک نیست؛ زبانی دستی است که به قطعات طلا، نقره و سنگ‌های زینتی گرما، شخصیت و امکان شخصی‌سازی می‌دهد."
                  : "Every Eloria creation brings material, colour, texture and detail together. Macramé is more than a technique to us: it is a handmade language that gives gold, silver and gemstones warmth, character and room for personal meaning."}
              </p>
              <p>
                {fa
                  ? "هدف ما ارائهٔ زیوری است که هم در استفادهٔ روزمره قابل همراهی باشد و هم برای هدیه یا یک مناسبت مهم، معنایی فراتر از ظاهر داشته باشد. به همین دلیل هر صفحهٔ محصول، اطلاعات واقعی اثر و مسیر روشن انتخاب آن را در اختیار شما می‌گذارد."
                  : "Our aim is jewelry that can accompany everyday life while carrying meaning for a gift or an important occasion. That is why each product page presents the real details of the creation and a clear path to an informed choice."}
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-3">
          {principles.map((principle) => {
            const Icon = principle.icon;
            return (
              <article key={principle.title} className="rounded-[2rem] border border-white/[.075] bg-[#061c15]/78 p-6 shadow-[0_24px_65px_rgba(0,0,0,.3)]">
                <div className="grid size-12 place-items-center rounded-2xl border border-[#d9b85f]/24 bg-[#d9b85f]/[.05] text-[#dfc26e]">
                  <Icon className="size-6" />
                </div>
                <h2 className="mt-5 text-lg text-[#eee1c7]">{principle.title}</h2>
                <p className="mt-3 text-xs leading-7 text-[#cbbd9d]/64">{principle.body}</p>
              </article>
            );
          })}
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl gap-4 lg:grid-cols-2" aria-label={fa ? "بخش‌های مرتبط الوریا" : "Related Eloria sections"}>
          <Link href={`/${locale}/story`} className="group rounded-[2rem] border border-[#d8ba64]/18 bg-[#061c15]/88 p-7 shadow-[0_24px_65px_rgba(0,0,0,.3)] transition hover:-translate-y-1 hover:border-[#dfc36d]/38">
            <BookOpenText className="size-6 text-[#dfc26e]" />
            <p className="mt-6 text-[9px] uppercase tracking-[.34em] text-[#d3bb78]/58">Eloria Story</p>
            <h2 className={`${fa ? "font-persian-title" : "font-semibold"} mt-3 text-2xl text-[#f2e1ba]`}>
              {fa ? "داستان و افسانهٔ مادر الوریا" : "The mother legend of Eloria"}
            </h2>
            <p className="mt-3 text-sm leading-8 text-[#d6c8aa]/66">
              {fa ? "افسانهٔ کهن، پیمان نخستین و هفت نیرویی که ریشهٔ روایت تمام آثار الوریاست." : "The ancient legend, First Covenant and seven forces behind every Eloria creation."}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs text-[#e7cc7f]">{fa ? "خواندن داستان" : "Read the story"}<ArrowUpLeft className="size-4" /></span>
          </Link>
          <Link href={`/${locale}/atelier`} className="group rounded-[2rem] border border-[#d8ba64]/18 bg-[#061c15]/88 p-7 shadow-[0_24px_65px_rgba(0,0,0,.3)] transition hover:-translate-y-1 hover:border-[#dfc36d]/38">
            <ScrollText className="size-6 text-[#dfc26e]" />
            <p className="mt-6 text-[9px] uppercase tracking-[.34em] text-[#d3bb78]/58">Eloria Atelier</p>
            <h2 className={`${fa ? "font-persian-title" : "font-semibold"} mt-3 text-2xl text-[#f2e1ba]`}>
              {fa ? "آتلیهٔ شخصیت‌ها و نگهبانان" : "The guardians and character atelier"}
            </h2>
            <p className="mt-3 text-sm leading-8 text-[#d6c8aa]/66">
              {fa ? "چهره، قلمرو و افسانهٔ پنهان هر اثر؛ جایی که شخصیت‌ها و تصاویر محصولات به دنیای اصلی متصل می‌شوند." : "Faces, realms and hidden legends—where product characters and imagery connect to the main world."}
            </p>
            <span className="mt-5 inline-flex items-center gap-2 text-xs text-[#e7cc7f]">{fa ? "ورود به آتلیه" : "Enter the atelier"}<ArrowUpLeft className="size-4" /></span>
          </Link>
        </section>
      </main>
    </InternalPageShell>
  );
}
