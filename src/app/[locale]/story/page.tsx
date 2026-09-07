import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowUpLeft, BookOpenText, Sparkles, Stars } from "lucide-react";

import { InternalPageShell } from "@/components/internal-page-shell";
import { ELORIA_GUARDIANS, ELORIA_MOTHER_LEGEND } from "@/lib/eloria-mythology";

type StoryPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: StoryPageProps): Promise<Metadata> {
  const { locale } = await params;
  const fa = locale !== "en";
  return {
    title: fa
      ? "داستان الوریا | افسانهٔ مادر، هفت نگهبان و پیمان نخستین"
      : "The Story of Eloria | The Mother Legend and Seven Guardians",
    description: fa
      ? "افسانهٔ مادر الوریا را بخوانید: درخت خاطره‌ها، سایهٔ بی‌نام، هفت نگهبان و پیمان نخستین؛ ریشهٔ تمام افسانه‌های پنهان زیورهای الوریا."
      : "Read Eloria’s mother legend: the Tree of Memories, Nameless Shadow, Seven Guardians and the First Covenant behind every hidden jewelry legend.",
    alternates: {
      canonical: `/${locale}/story`,
      languages: { fa: "/fa/story", en: "/en/story", "x-default": "/fa/story" },
    },
  };
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);
  const fa = locale === "fa";

  const paragraphs = fa
    ? [
        ELORIA_MOTHER_LEGEND.introductionFa,
        ELORIA_MOTHER_LEGEND.treeFa,
        ELORIA_MOTHER_LEGEND.conflictFa,
        ELORIA_MOTHER_LEGEND.covenantFa,
      ]
    : [
        ELORIA_MOTHER_LEGEND.introductionEn,
        ELORIA_MOTHER_LEGEND.treeEn,
        ELORIA_MOTHER_LEGEND.conflictEn,
        ELORIA_MOTHER_LEGEND.covenantEn,
      ];

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: fa
      ? ELORIA_MOTHER_LEGEND.titleFa
      : ELORIA_MOTHER_LEGEND.titleEn,
    inLanguage: locale,
    isPartOf: { "@type": "WebSite", name: "ELORIA", url: "https://eloriagallery.ir" },
    mainEntityOfPage: `https://eloriagallery.ir/${locale}/story`,
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
          <div className="mx-auto grid size-16 place-items-center rounded-full border border-[#d9ba63]/38 bg-[radial-gradient(circle,rgba(211,176,85,0.16),rgba(4,29,21,0.9)_70%)] text-[#e7ca77]">
            <BookOpenText className="size-7" />
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-[.42em] text-[#cfb66f]/60">
            The Story of Eloria
          </p>
          <h1 className={`${fa ? "font-persian-title leading-[1.95]" : "font-semibold"} mt-3 text-4xl text-[#f6e8c6] sm:text-5xl lg:text-6xl`}>
            {fa ? "داستان الوریا" : "The Story of Eloria"}
          </h1>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-9 text-[#d8caaa]/72 sm:text-base">
            {fa
              ? "این افسانهٔ مادر، ریشهٔ جهان الوریا و نقطهٔ اتصال تمام افسانه‌های پنهان محصولات است."
              : "This mother legend is the root of Eloria’s world and the connecting thread behind every product’s hidden legend."}
          </p>
        </header>

        <article id="mother-legend" className="relative mx-auto mt-14 max-w-6xl overflow-hidden rounded-[2.8rem] border border-[#d8b860]/22 bg-[linear-gradient(145deg,rgba(9,45,32,0.94),rgba(2,20,14,0.99))] px-6 py-10 shadow-[0_34px_100px_rgba(0,0,0,0.4)] sm:px-10 sm:py-14 lg:px-16">
          <div aria-hidden="true" className="absolute inset-x-16 top-0 h-px bg-gradient-to-r from-transparent via-[#efd17a]/65 to-transparent" />
          <div className="relative mx-auto max-w-4xl">
            <p className="text-[9px] uppercase tracking-[.4em] text-[#d3bb78]/58">The Mother Legend</p>
            <h2 className={`${fa ? "font-persian-title leading-[1.9]" : "font-semibold"} mt-4 text-3xl text-[#f2e1ba] sm:text-4xl`}>
              {fa ? ELORIA_MOTHER_LEGEND.titleFa : ELORIA_MOTHER_LEGEND.titleEn}
            </h2>
            <div className="mt-7 space-y-5 text-sm leading-9 text-[#d6c8aa]/72 sm:text-base">
              {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          </div>
        </article>

        <section className="mx-auto mt-8 max-w-6xl" aria-labelledby="guardians-title">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-[.4em] text-[#d3bb78]/58">The Seven Guardians</p>
              <h2 id="guardians-title" className={`${fa ? "font-persian-title leading-[1.9]" : "font-semibold"} mt-2 text-3xl text-[#f2e1ba] sm:text-4xl`}>
                {fa ? "هفت شاخه، هفت نگهبان" : "Seven branches, seven guardians"}
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-8 text-[#d6c8aa]/65">
              {fa ? "راز، رویا، میراث، زندگی، هنر، خرد و آزادی؛ هر نگهبان، پاسدار یکی از شاخه‌های درخت خاطره‌هاست." : "Mystery, dream, heritage, life, craft, wisdom and freedom—each Guardian protects one branch of the Tree of Memories."}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {ELORIA_GUARDIANS.map((guardian) => (
              <Link key={guardian.id} id={`guardian-${guardian.id}`} href={`/${locale}/atelier#guardian-${guardian.id}`} className="scroll-mt-28 rounded-[2rem] border border-[#d8ba64]/18 bg-[#061c15]/88 p-5 shadow-[0_22px_65px_rgba(0,0,0,.30)] transition hover:-translate-y-1 hover:border-[#dfc36d]/38">
                <Stars className="size-5 text-[#dfc26e]" />
                <p className="mt-5 text-[10px] text-[#d8bb70]/58">{fa ? guardian.domainFa : guardian.domainEn}</p>
                <h3 className="mt-1 text-xl text-[#f1e0b9]">{fa ? guardian.nameFa : guardian.nameEn}</h3>
                <p className="mt-3 text-xs leading-7 text-[#d0c09f]/66">{fa ? guardian.titleFa : guardian.titleEn}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-[11px] text-[#e5cd86]">{fa ? "دیدن در آتلیه" : "View in the atelier"}<ArrowUpLeft className="size-3.5" /></span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto mt-8 grid max-w-6xl gap-4 lg:grid-cols-2">
          <Link href={`/${locale}/atelier#hidden-legends`} className="rounded-[2rem] border border-[#d8ba64]/18 bg-[#061c15]/88 p-7 shadow-[0_22px_65px_rgba(0,0,0,.30)] transition hover:border-[#dfc36d]/38">
            <Sparkles className="size-6 text-[#dfc26e]" />
            <h2 className={`${fa ? "font-persian-title" : "font-semibold"} mt-5 text-2xl text-[#f2e1ba]`}>{fa ? "افسانه‌های پنهان محصولات" : "Hidden legends of creations"}</h2>
            <p className="mt-3 text-sm leading-8 text-[#d6c8aa]/66">{fa ? "هر محصول یک افسانهٔ یکتا دارد؛ داستانی مستقل که زیر پرچم یکی از هفت نگهبان ثبت می‌شود." : "Every product has one unique story, independently told beneath the banner of one of the Seven Guardians."}</p>
          </Link>
          <Link href={`/${locale}/about`} className="rounded-[2rem] border border-[#d8ba64]/18 bg-[#061c15]/88 p-7 shadow-[0_22px_65px_rgba(0,0,0,.30)] transition hover:border-[#dfc36d]/38">
            <BookOpenText className="size-6 text-[#dfc26e]" />
            <h2 className={`${fa ? "font-persian-title" : "font-semibold"} mt-5 text-2xl text-[#f2e1ba]`}>{fa ? "دربارهٔ رسمی برند" : "The official brand introduction"}</h2>
            <p className="mt-3 text-sm leading-8 text-[#d6c8aa]/66">{fa ? "برای آشنایی با نگاه طراحی، متریال و شیوهٔ انتخاب زیورهای دست‌ساز الوریا، بخش درباره ما را ببینید." : "Visit About Eloria for our design philosophy, materials and approach to handmade jewelry."}</p>
          </Link>
        </section>
      </main>
    </InternalPageShell>
  );
}
