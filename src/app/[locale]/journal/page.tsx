import Image from "next/image";
import Link from "next/link";

import { BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { InternalPageShell } from "@/components/internal-page-shell";
import { getPublishedArticles } from "@/lib/content-articles";

export const revalidate = 3600;

function dateLabel(value: Date | null, locale: "fa" | "en"): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    dateStyle: "medium",
  }).format(value);
}

export default async function JournalIndexPage({
  params,
}: {
  params: Promise<{
    locale: string;
  }>;
}) {
  const { locale } = await params;

  if (locale !== "fa" && locale !== "en") {
    notFound();
  }

  setRequestLocale(locale);

  const isPersian = locale === "fa";
  const articles = await getPublishedArticles();

  return (
    <InternalPageShell locale={locale}>
      <section className="relative z-10 mx-auto w-full max-w-[1450px] px-4 pb-28 pt-[138px] sm:px-6 sm:pt-[154px] lg:px-10">
        <header className="mx-auto max-w-4xl text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full border border-[#d9ba63]/38 bg-[radial-gradient(circle,rgba(211,176,85,0.15),rgba(4,29,21,0.9)_70%)] text-[#e7ca77]">
            <span className="absolute size-12 rounded-full border border-dashed border-[#e0c26d]/22" />
            <BookOpen className="relative size-7" />
          </div>
          <p className="mt-6 text-[9px] uppercase tracking-[0.46em] text-[#cfb66f]/60">
            Eloria Journal
          </p>
          <h1
            className={[
              "mt-3 text-[#f6e8c6]",
              isPersian
                ? "font-persian-title pb-4 text-4xl font-semibold leading-[1.95] sm:text-5xl"
                : "text-4xl font-semibold leading-tight sm:text-5xl",
            ].join(" ")}
          >
            {isPersian ? "مجلهٔ الوریا" : "The Eloria Journal"}
          </h1>
          <p className="mx-auto max-w-3xl text-sm leading-9 text-[#d8caaa]/72 sm:text-base">
            {isPersian
              ? "راهنماهای بازبینی‌شده برای شناخت جواهر، انتخاب آگاهانه و بررسی دقیق اطلاعاتی که پیش از خرید اهمیت دارند."
              : "Reviewed guides for understanding jewellery, making considered choices, and checking the details that matter before you buy."}
          </p>
        </header>

        {articles.length === 0 ? (
          <div className="mx-auto mt-14 max-w-3xl rounded-[2.2rem] border border-[#d9b85f]/22 bg-[#061c15]/80 px-7 py-12 text-center shadow-[0_24px_65px_rgba(0,0,0,0.28)] backdrop-blur-xl">
            <Sparkles className="mx-auto size-7 text-[#e2c777]" />
            <h2 className="mt-4 text-xl text-[#f1dfb7]">
              {isPersian
                ? "اولین راهنمای الوریا در حال آماده‌شدن است"
                : "The first Eloria guide is being prepared"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-8 text-[#d4c5a7]/68">
              {isPersian
                ? "مقاله‌ها فقط پس از بازبینی تحریریه منتشر می‌شوند تا اطلاعات محصول و توصیه‌ها قابل اعتماد بمانند."
                : "Articles are only published after editorial review so product details and guidance remain trustworthy."}
            </p>
            <Link
              href={`/${locale}/products`}
              className="mt-7 inline-flex rounded-full border border-[#d9b85f]/40 bg-[#d9b85f]/[0.07] px-5 py-3 text-xs text-[#ecd794] transition hover:-translate-y-0.5 hover:border-[#efd17d]/72 hover:bg-[#d9b85f]/[0.11]"
            >
              {isPersian ? "مشاهدهٔ جواهرها" : "Explore the jewellery"}
            </Link>
          </div>
        ) : (
          <div className="mt-14 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {articles.map((article, index) => {
              const title = isPersian ? article.titleFa : article.titleEn;
              const excerpt = isPersian ? article.excerptFa : article.excerptEn;
              const keyword = isPersian
                ? article.focusKeywordFa
                : article.focusKeywordEn;

              return (
                <article
                  key={article.slug}
                  className="group flex min-h-full flex-col overflow-hidden rounded-[2rem] border border-white/[0.075] bg-[linear-gradient(145deg,rgba(7,43,31,0.92),rgba(2,20,14,0.98))] shadow-[0_24px_65px_rgba(0,0,0,0.28)] transition duration-500 hover:-translate-y-1 hover:border-[#d9b85f]/34"
                >
                  <div className="relative aspect-[16/9] overflow-hidden border-b border-[#d9b85f]/12 bg-[#09291d]">
                    {article.coverImageUrl ? (
                      <Image
                        src={article.coverImageUrl}
                        alt={title}
                        fill
                        priority={index < 2}
                        sizes="(min-width: 1280px) 31vw, (min-width: 768px) 48vw, 100vw"
                        className="object-cover transition duration-700 group-hover:scale-[1.045]"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_76%_22%,rgba(211,177,86,0.26),transparent_27%),linear-gradient(145deg,#0b5b42,#031b13)]" />
                    )}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(1,12,8,0.68))]" />
                    <span className="absolute bottom-4 end-4 rounded-full border border-[#e7ca78]/28 bg-[#041b13]/75 px-3 py-1.5 text-[10px] text-[#eed590] backdrop-blur-md">
                      {keyword ||
                        (isPersian ? "مجلهٔ الوریا" : "Eloria Journal")}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-2 text-[10px] text-[#d4bd7a]/60">
                      <CalendarDays className="size-3.5" />
                      {dateLabel(article.publishedAt, locale)}
                    </div>
                    <h2
                      className={[
                        "mt-4 text-xl font-medium leading-relaxed text-[#f2e1b9]",
                        isPersian ? "font-persian-title" : "leading-snug",
                      ].join(" ")}
                    >
                      {title}
                    </h2>
                    <p className="mt-3 line-clamp-4 text-sm leading-8 text-[#d4c5a7]/68">
                      {excerpt}
                    </p>
                    {article.sourceProduct ? (
                      <p className="mt-4 text-[11px] text-[#d7be78]/62">
                        {isPersian
                          ? `بر پایهٔ اطلاعات ${article.sourceProduct.nameFa}`
                          : `Based on ${article.sourceProduct.nameEn}`}
                      </p>
                    ) : null}
                    <Link
                      href={`/${locale}/journal/${encodeURIComponent(article.slug)}`}
                      className="mt-6 inline-flex w-fit items-center gap-2 text-xs text-[#ebd28c] transition hover:text-[#fff0bd]"
                    >
                      <span>
                        {isPersian ? "خواندن راهنما" : "Read the guide"}
                      </span>
                      <span aria-hidden="true">←</span>
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </InternalPageShell>
  );
}
