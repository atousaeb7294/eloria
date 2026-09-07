import type { Metadata } from "next";

import Image from "next/image";
import Link from "next/link";

import { ArrowLeft, CalendarDays, Gem, RefreshCw } from "lucide-react";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import { ArticleMarkdown } from "@/components/article-markdown";
import { ArticleStructuredData } from "@/components/article-structured-data";
import { InternalPageShell } from "@/components/internal-page-shell";
import { getPublishedArticleBySlug } from "@/lib/content-articles";
import { localizedPageMetadata, truncateMetaDescription } from "@/lib/seo";

export const revalidate = 3600;

type ArticleParams = {
  locale: string;
  slug: string;
};

function formatDate(value: Date | null, locale: "fa" | "en"): string {
  if (!value) {
    return "—";
  }

  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    dateStyle: "long",
  }).format(value);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ArticleParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;

  if (locale !== "fa" && locale !== "en") {
    return {};
  }

  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
    return localizedPageMetadata({
      locale,
      path: `/journal/${encodeURIComponent(slug)}`,
      title:
        locale === "fa"
          ? "مقاله پیدا نشد | الوریا"
          : "Article not found | ELORIA",
      description:
        locale === "fa"
          ? "این صفحه در دسترس نیست."
          : "This page is unavailable.",
      noIndex: true,
    });
  }

  const isPersian = locale === "fa";
  const title = isPersian
    ? article.seoTitleFa || article.titleFa
    : article.seoTitleEn || article.titleEn;
  const description = truncateMetaDescription(
    isPersian
      ? article.seoDescriptionFa || article.excerptFa
      : article.seoDescriptionEn || article.excerptEn,
    isPersian
      ? "راهنمای بازبینی‌شدهٔ الوریا برای انتخاب آگاهانهٔ جواهر."
      : "A reviewed Eloria guide for making a considered jewellery choice.",
  );

  return localizedPageMetadata({
    locale,
    path: `/journal/${encodeURIComponent(slug)}`,
    title,
    description,
    image: article.coverImageUrl ?? undefined,
  });
}

export default async function JournalArticlePage({
  params,
}: {
  params: Promise<ArticleParams>;
}) {
  const { locale, slug } = await params;

  if (locale !== "fa" && locale !== "en") {
    notFound();
  }

  setRequestLocale(locale);

  const article = await getPublishedArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const isPersian = locale === "fa";
  const title = isPersian ? article.titleFa : article.titleEn;
  const excerpt = isPersian ? article.excerptFa : article.excerptEn;
  const content = isPersian ? article.contentFa : article.contentEn;
  const seoDescription = isPersian
    ? article.seoDescriptionFa || article.excerptFa
    : article.seoDescriptionEn || article.excerptEn;

  return (
    <InternalPageShell locale={locale}>
      <ArticleStructuredData
        locale={locale}
        slug={article.slug}
        title={title}
        description={seoDescription}
        image={article.coverImageUrl}
        datePublished={article.publishedAt}
        dateModified={article.updatedAt}
      />

      <article className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pb-28 pt-[138px] sm:px-6 sm:pt-[154px] lg:px-10">
        <Link
          href={`/${locale}/journal`}
          className="inline-flex items-center gap-2 rounded-full border border-[#d9b85f]/28 bg-[#061f17]/75 px-4 py-2 text-[11px] text-[#e5d19a] backdrop-blur-xl transition hover:-translate-y-0.5 hover:border-[#efd17d]/65"
        >
          <ArrowLeft
            className={["size-4", isPersian ? "rotate-180" : ""].join(" ")}
          />
          {isPersian ? "بازگشت به مجله" : "Back to journal"}
        </Link>

        <header className="mx-auto mt-10 max-w-4xl text-center">
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[10px] text-[#d2b774]/64">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="size-3.5" />
              {isPersian ? "انتشار" : "Published"}:{" "}
              {formatDate(article.publishedAt, locale)}
            </span>
            <span className="inline-flex items-center gap-2">
              <RefreshCw className="size-3.5" />
              {isPersian ? "بازبینی" : "Reviewed"}:{" "}
              {formatDate(article.updatedAt, locale)}
            </span>
          </div>
          <h1
            className={[
              "mt-6 text-[#f6e8c6]",
              isPersian
                ? "font-persian-title pb-4 text-4xl font-semibold leading-[1.95] sm:text-5xl lg:text-6xl"
                : "text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl",
            ].join(" ")}
          >
            {title}
          </h1>
          <p className="mx-auto max-w-3xl text-sm leading-9 text-[#d8caaa]/75 sm:text-base">
            {excerpt}
          </p>
        </header>

        {article.coverImageUrl ? (
          <div className="relative mx-auto mt-12 aspect-[16/8] max-w-5xl overflow-hidden rounded-[2.4rem] border border-[#d9b85f]/20 bg-[#08271c] shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
            <Image
              src={article.coverImageUrl}
              alt={title}
              fill
              priority
              sizes="(min-width: 1024px) 900px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent,rgba(1,12,8,0.38))]" />
          </div>
        ) : null}

        <div className="mx-auto mt-10 max-w-4xl rounded-[2.3rem] border border-[#d9b85f]/18 bg-[linear-gradient(145deg,rgba(6,35,25,0.9),rgba(2,19,13,0.96))] px-6 py-8 shadow-[0_26px_75px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:px-10 sm:py-12">
          <ArticleMarkdown value={content} />
        </div>

        {article.sourceProduct ? (
          <aside className="mx-auto mt-8 flex max-w-4xl flex-col items-start justify-between gap-5 rounded-[1.8rem] border border-[#d9b85f]/22 bg-[#072519]/78 p-6 sm:flex-row sm:items-center">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-[#d9b85f]/25 bg-[#d9b85f]/[0.06] text-[#e1c573]">
                <Gem className="size-5" />
              </span>
              <div>
                <p className="text-xs text-[#d5c29a]/66">
                  {isPersian ? "محصول مرتبط" : "Related piece"}
                </p>
                <p className="mt-1 text-sm text-[#f0deb8]">
                  {isPersian
                    ? article.sourceProduct.nameFa
                    : article.sourceProduct.nameEn}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/products/${encodeURIComponent(article.sourceProduct.slug)}`}
              className="rounded-full border border-[#d9b85f]/40 bg-[#d9b85f]/[0.07] px-5 py-3 text-xs text-[#ecd794] transition hover:-translate-y-0.5 hover:border-[#efd17d]/72 hover:bg-[#d9b85f]/[0.11]"
            >
              {isPersian ? "دیدن صفحهٔ محصول" : "View product page"}
            </Link>
          </aside>
        ) : null}
      </article>
    </InternalPageShell>
  );
}
