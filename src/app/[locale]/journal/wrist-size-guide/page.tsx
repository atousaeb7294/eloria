import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { ArrowLeft, CircleDot, Ruler, ShieldCheck } from "lucide-react";

import { ArticleStructuredData } from "@/components/article-structured-data";
import { InternalPageShell } from "@/components/internal-page-shell";
import { localizedPageMetadata } from "@/lib/seo";

type PageProps = { params: Promise<{ locale: string }> };

const SLUG = "wrist-size-guide";
const PUBLISHED_AT = new Date("2026-08-27T00:00:00.000Z");

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") return {};

  const isPersian = locale === "fa";
  return localizedPageMetadata({
    locale,
    path: `/journal/${SLUG}`,
    title: isPersian
      ? "راهنمای اندازه‌گیری سایز مچ برای دستبند | الوریا"
      : "How to Measure Wrist Size for a Bracelet | Eloria",
    description: isPersian
      ? "آموزش دقیق اندازه‌گیری دور مچ دست برای سفارش دستبند؛ روش اندازه‌گیری با متر یا نخ، میزان آزادی مناسب و نکات ثبت سایز در سفارش الوریا."
      : "A precise guide to measuring your wrist for a bracelet, including tape/string methods, fit allowance and how to enter the size with your Eloria order.",
  });
}

export default async function WristSizeGuidePage({ params }: PageProps) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  setRequestLocale(locale);
  const fa = locale === "fa";

  const title = fa
    ? "راهنمای اندازه‌گیری مچ برای شخصی‌سازی دستبند"
    : "How to Measure Your Wrist for a Bracelet";
  const description = fa
    ? "سایز تمام دستبندهای الوریا استاندارد است؛ اگر شخصی‌سازی سایز را می‌خواهید، اندازه واقعی مچ را با این راهنما ثبت کنید و در توضیحات سفارش بنویسید."
    : "Measure your actual wrist in a few simple steps so your bracelet can be prepared more accurately.";

  return (
    <InternalPageShell locale={locale}>
      <ArticleStructuredData
        locale={locale}
        slug={SLUG}
        title={title}
        description={description}
        image={null}
        datePublished={PUBLISHED_AT}
        dateModified={PUBLISHED_AT}
      />

      <article className="relative z-10 mx-auto w-full max-w-[1120px] px-4 pb-28 pt-[138px] sm:px-6 sm:pt-[154px] lg:px-10">
        <Link
          href={`/${locale}/journal`}
          className="inline-flex items-center gap-2 rounded-full border border-[#d9b85f]/28 bg-[#061f17]/75 px-4 py-2 text-[11px] text-[#e5d19a] transition hover:border-[#efd17d]/65"
        >
          <ArrowLeft className={["size-4", fa ? "rotate-180" : ""].join(" ")} />
          {fa ? "بازگشت به مجله" : "Back to journal"}
        </Link>

        <header className="mx-auto mt-10 max-w-4xl text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full border border-[#d9ba63]/34 bg-[#d9b85f]/[0.06] text-[#e7ca77]">
            <Ruler className="size-7" />
          </span>
          <p className="mt-5 text-[9px] uppercase tracking-[0.42em] text-[#cfb66f]/60">Eloria Fit Guide</p>
          <h1 className={["mt-3 text-[#f6e8c6]", fa ? "font-persian-title pb-4 text-4xl font-semibold leading-[1.95] sm:text-5xl" : "text-4xl font-semibold leading-tight sm:text-5xl"].join(" ")}>
            {title}
          </h1>
          <p className="mx-auto max-w-3xl text-sm leading-9 text-[#d8caaa]/72 sm:text-base">{description}</p>
        </header>

        <div className="mx-auto mt-10 max-w-4xl space-y-6 rounded-[2.3rem] border border-[#d9b85f]/18 bg-[linear-gradient(145deg,rgba(6,35,25,0.9),rgba(2,19,13,0.96))] px-6 py-8 text-sm leading-9 text-[#d8caaa]/76 shadow-[0_26px_75px_rgba(0,0,0,0.34)] sm:px-10 sm:py-12 sm:text-base">
          <section>
            <h2 className="flex items-center gap-3 text-xl font-semibold text-[#f0ddb0]">
              <CircleDot className="size-5 text-[#dfc16f]" />
              {fa ? "روش پیشنهادی با متر خیاطی" : "Recommended method: flexible tape"}
            </h2>
            <ol className="mt-4 list-decimal space-y-2 pe-5 marker:text-[#dfc16f]">
              <li>{fa ? "متر را بدون فشار، دقیقاً دور بخشی از مچ قرار دهید که معمولاً دستبند روی آن می‌نشیند." : "Wrap the tape around the part of the wrist where you normally wear a bracelet, without tightening it."}</li>
              <li>{fa ? "عدد محل اتصال دو سر متر را بر حسب سانتی‌متر بخوانید و تا یک رقم اعشار ثبت کنید؛ برای مثال ۱۵٫۸ سانتی‌متر." : "Read the meeting point in centimetres and record one decimal place, for example 15.8 cm."}</li>
              <li>{fa ? "اگر شخصی‌سازی سایز می‌خواهید، این عدد را به‌عنوان «اندازه واقعی مچ» در توضیحات سفارش بنویسید؛ در غیر این صورت سایز استاندارد همان مدل ارسال می‌شود." : "Enter this as your “actual wrist measurement” in the order notes; the appropriate fit allowance is handled separately for the model."}</li>
            </ol>
          </section>

          <section className="border-t border-white/[0.07] pt-6">
            <h2 className="text-xl font-semibold text-[#f0ddb0]">{fa ? "اگر متر خیاطی ندارید" : "If you do not have a flexible tape"}</h2>
            <p className="mt-3">{fa ? "یک نخ یا نوار کاغذی باریک را دور مچ قرار دهید، محل برخورد دو سر را علامت بزنید و سپس طول آن را با خط‌کش اندازه بگیرید. نخ نباید کشسان باشد، چون عدد نهایی را کوچک‌تر از واقعیت نشان می‌دهد." : "Wrap a non-stretch string or narrow paper strip around your wrist, mark where the ends meet, then measure that length with a ruler. Avoid elastic string because it can understate the true measurement."}</p>
          </section>

          <section className="border-t border-white/[0.07] pt-6">
            <h2 className="text-xl font-semibold text-[#f0ddb0]">{fa ? "چقدر آزادی اضافه کنم؟" : "How much extra room should I add?"}</h2>
            <p className="mt-3">{fa ? "برای سفارش، بهتر است فقط اندازه واقعی مچ را بنویسید و خودتان عددی به آن اضافه نکنید. میزان آزادی مناسب به نوع قفل، ضخامت بافت، سنگ‌ها و فرم همان دستبند وابسته است. اگر دوست دارید دستبند آزاد یا کاملاً فیت باشد، این ترجیح را کنار اندازه مچ ذکر کنید." : "For an order, enter the actual wrist measurement rather than adding your own allowance. The ideal extra room depends on the clasp, weave thickness, stones and construction of that bracelet. If you prefer a loose or close fit, mention that preference next to the measurement."}</p>
          </section>

          <aside className="rounded-2xl border border-[#dfc16f]/18 bg-[#dfc16f]/[0.035] p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 size-5 shrink-0 text-[#dfc16f]" />
              <p>
                <strong className="text-[#f0ddb0]">{fa ? "هنگام ثبت سفارش دستبند:" : "When ordering a bracelet:"}</strong>{" "}
                {fa ? "برای شخصی‌سازی در قسمت «توضیحات سفارش» بنویسید: «اندازه واقعی مچ: … سانتی‌متر». اگر توضیح اضافه‌ای درباره میزان آزادی دارید، همان‌جا ذکر کنید." : "In the order notes write: “Actual wrist: … cm” and, if useful, add “loose / regular / close fit”."}
              </p>
            </div>
          </aside>

          <p className="text-xs leading-7 text-[#c6b894]/56">{fa ? "این راهنما برای انتخاب و آماده‌سازی بهتر دستبند است و جایگزین مشخصات اختصاصی هر مدل نیست. اگر یک محصول دستور اندازه‌گیری متفاوتی داشته باشد، توضیح همان محصول اولویت دارد." : "This guide supports bracelet selection and preparation; it does not override model-specific instructions. If a product gives different measurement guidance, follow that product’s instructions."}</p>
        </div>
      </article>
    </InternalPageShell>
  );
}
