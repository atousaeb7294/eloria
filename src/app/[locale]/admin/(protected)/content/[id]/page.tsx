import Link from "next/link";

import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  ExternalLink,
  FileClock,
  FileText,
  Save,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";

import { saveContentArticleAction } from "@/app/[locale]/admin/(protected)/content/actions";
import { formatAdminDate } from "@/lib/admin-format";
import { getAdminContentArticle } from "@/lib/content-articles";
import {
  articleSeoScore,
  articleStatusLabels,
  contentArticleStatuses,
} from "@/lib/content-studio";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function singleValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function scoreTone(score: number): string {
  if (score >= 80) {
    return "text-emerald-200";
  }

  if (score >= 60) {
    return "text-[#eed17c]";
  }

  return "text-red-200";
}

const inputClass =
  "mt-2 min-h-11 w-full rounded-xl border border-[#d7b95f]/18 bg-[#041911] px-3.5 py-2.5 text-sm text-[#f0e1bf] outline-none transition placeholder:text-[#b6a986]/35 focus:border-[#e4c773]/55";

const labelClass = "text-xs text-[#d8c9aa]/70";

export default async function AdminContentEditorPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
    id: string;
  }>;
  searchParams: Promise<{
    saved?: string | string[];
    created?: string | string[];
    error?: string | string[];
  }>;
}) {
  const { locale, id } = await params;

  if ((locale !== "fa" && locale !== "en") || !/^[0-9a-f-]{36}$/i.test(id)) {
    notFound();
  }

  const [article, query] = await Promise.all([
    getAdminContentArticle(id),
    searchParams,
  ]);

  if (!article) {
    notFound();
  }

  const saved = singleValue(query.saved) === "1";
  const created = singleValue(query.created);
  const error = singleValue(query.error)?.slice(0, 500);
  const score = articleSeoScore(article);
  const saveAction = saveContentArticleAction.bind(null, article.id, locale);
  const publicHref = `/${locale}/journal/${encodeURIComponent(article.slug)}`;

  return (
    <div className="mx-auto max-w-[1540px] space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <Link
            href={`/${locale}/admin/content`}
            className="text-xs text-[#d9c17f]/72 transition hover:text-[#f0d990]"
          >
            ← بازگشت به محتوا و سئو
          </Link>
          <h1 className="mt-3 text-2xl font-semibold text-[#f5e8c9] sm:text-3xl">
            ویرایش مقاله
          </h1>
          <p className="mt-2 text-xs text-[#cbbd9d]/62">
            تغییرات مقاله ثبت می‌شوند. انتشار اولیه فقط با تیک تأیید عمومی انجام
            می‌شود.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={[
              "rounded-xl border px-3 py-2 text-sm font-medium",
              scoreTone(score),
              "border-current/20 bg-current/[0.04]",
            ].join(" ")}
          >
            سلامت محتوا: {new Intl.NumberFormat("fa-IR").format(score)} / ۱۰۰
          </span>
          {article.status === "PUBLISHED" ? (
            <Link
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-[#d7b95f]/25 px-3 py-2 text-xs text-[#e6cd87] transition hover:border-[#e8cf88]/55 hover:bg-[#d7b95f]/[0.07]"
            >
              مشاهدهٔ عمومی
              <ExternalLink className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      {saved || created ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-300/20 bg-emerald-300/[0.07] px-5 py-4 text-sm text-emerald-100">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <p>
            {saved
              ? "تغییرات مقاله و رویداد حسابرسی ذخیره شد."
              : created === "product-draft"
                ? "پیش‌نویس بر پایهٔ اطلاعات محصول ساخته شد. پیش از انتشار آن را دقیق بازبینی کنید."
                : "پیش‌نویس دستی ساخته شد. اطلاعات هر دو زبان را تکمیل کنید."}
          </p>
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-300/20 bg-red-950/20 px-5 py-4 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_330px]">
        <form
          action={saveAction}
          className="space-y-6 rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-7"
        >
          <section>
            <div className="flex items-center gap-3">
              <FileText className="size-5 text-[#e4c673]" />
              <h2 className="text-lg text-[#f2e2bd]">هویت و مسیر مقاله</h2>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                نشانی مقاله (slug)
                <input
                  name="slug"
                  defaultValue={article.slug}
                  required
                  dir="ltr"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                وضعیت
                <select
                  name="status"
                  defaultValue={article.status}
                  className={inputClass}
                >
                  {contentArticleStatuses.map((status) => (
                    <option key={status} value={status}>
                      {articleStatusLabels[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label className={labelClass}>
                عنوان فارسی
                <input
                  name="titleFa"
                  defaultValue={article.titleFa}
                  required
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                English title
                <input
                  name="titleEn"
                  defaultValue={article.titleEn}
                  required
                  dir="ltr"
                  className={inputClass}
                />
              </label>
              <label className={[labelClass, "sm:col-span-2"].join(" ")}>
                نشانی تصویر شاخص (اختیاری)
                <input
                  name="coverImageUrl"
                  defaultValue={article.coverImageUrl ?? ""}
                  dir="ltr"
                  placeholder="/images/... یا https://..."
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <section className="border-t border-[#d7b95f]/12 pt-6">
            <div className="flex items-center gap-3">
              <LanguagesIcon />
              <h2 className="text-lg text-[#f2e2bd]">خلاصه و متن دو‌زبانه</h2>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className={labelClass}>
                خلاصهٔ فارسی
                <textarea
                  name="excerptFa"
                  defaultValue={article.excerptFa}
                  required
                  rows={5}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                English excerpt
                <textarea
                  name="excerptEn"
                  defaultValue={article.excerptEn}
                  required
                  rows={5}
                  dir="ltr"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                متن فارسی
                <textarea
                  name="contentFa"
                  defaultValue={article.contentFa}
                  required
                  rows={20}
                  className={[inputClass, "font-sans leading-8"].join(" ")}
                />
              </label>
              <label className={labelClass}>
                English content
                <textarea
                  name="contentEn"
                  defaultValue={article.contentEn}
                  required
                  rows={20}
                  dir="ltr"
                  className={[inputClass, "font-sans leading-8"].join(" ")}
                />
              </label>
            </div>
            <p className="mt-3 text-[11px] leading-6 text-[#cbbd9d]/50">
              ساختار سبک متن: # و ## برای تیتر و - برای فهرست. HTML خام اجرا
              نمی‌شود؛ متن عمومی به‌صورت امن نمایش داده می‌شود.
            </p>
          </section>

          <section className="border-t border-[#d7b95f]/12 pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-[#e4c673]" />
              <h2 className="text-lg text-[#f2e2bd]">متادیتای موتور جست‌وجو</h2>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <label className={labelClass}>
                عنوان سئوی فارسی
                <input
                  name="seoTitleFa"
                  defaultValue={article.seoTitleFa ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                English SEO title
                <input
                  name="seoTitleEn"
                  defaultValue={article.seoTitleEn ?? ""}
                  dir="ltr"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                توضیح سئوی فارسی
                <textarea
                  name="seoDescriptionFa"
                  defaultValue={article.seoDescriptionFa ?? ""}
                  rows={4}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                English SEO description
                <textarea
                  name="seoDescriptionEn"
                  defaultValue={article.seoDescriptionEn ?? ""}
                  rows={4}
                  dir="ltr"
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                کلمهٔ کلیدی فارسی
                <input
                  name="focusKeywordFa"
                  defaultValue={article.focusKeywordFa ?? ""}
                  className={inputClass}
                />
              </label>
              <label className={labelClass}>
                English focus keyword
                <input
                  name="focusKeywordEn"
                  defaultValue={article.focusKeywordEn ?? ""}
                  dir="ltr"
                  className={inputClass}
                />
              </label>
            </div>
          </section>

          <label className="flex items-start gap-3 rounded-2xl border border-[#d7b95f]/16 bg-[#d7b95f]/[0.035] p-4 text-xs leading-7 text-[#d8c9aa]/72">
            <input
              name="confirmPublish"
              value="publish"
              type="checkbox"
              className="mt-1 size-4 accent-[#d9b85f]"
            />
            <span>
              اگر وضعیت را برای نخستین بار روی «منتشرشده» می‌گذارید، با زدن این
              تیک تأیید می‌کنید متن هر دو زبان، مشخصات محصول و داده‌های سئو را
              بازبینی کرده‌اید. انتشار خودکار بدون این تأیید انجام نمی‌شود.
            </span>
          </label>

          <button
            type="submit"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfc16c]/40 bg-[#d9b85f]/[0.1] px-5 text-sm text-[#f4dd99] transition hover:-translate-y-0.5 hover:border-[#efd17a]/70 hover:bg-[#d9b85f]/[0.15]"
          >
            <Save className="size-4" />
            ذخیرهٔ امن مقاله
          </button>
        </form>

        <aside className="space-y-5">
          <section className="rounded-[1.8rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="size-5 text-[#e4c673]" />
              <h2 className="text-base text-[#f2e2bd]">منبع و کنترل انتشار</h2>
            </div>
            <dl className="mt-5 space-y-4 text-xs">
              <div>
                <dt className="text-[#cbbd9d]/52">منشأ</dt>
                <dd className="mt-1 text-[#eadbb9]">
                  {article.origin === "PRODUCT_ASSISTED"
                    ? "پیش‌نویس مبتنی بر محصول"
                    : "نوشتهٔ دستی"}
                </dd>
              </div>
              {article.sourceProduct ? (
                <div>
                  <dt className="text-[#cbbd9d]/52">محصول پایه</dt>
                  <dd className="mt-1 text-[#eadbb9]">
                    {article.sourceProduct.nameFa}
                  </dd>
                </div>
              ) : null}
              {article.sourceCollection ? (
                <div>
                  <dt className="text-[#cbbd9d]/52">مجموعهٔ پایه</dt>
                  <dd className="mt-1 text-[#eadbb9]">
                    {article.sourceCollection.nameFa}
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="text-[#cbbd9d]/52">ساخته‌شده</dt>
                <dd className="mt-1 text-[#eadbb9]">
                  {formatAdminDate(article.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-[#cbbd9d]/52">آخرین تغییر</dt>
                <dd className="mt-1 text-[#eadbb9]">
                  {formatAdminDate(article.updatedAt)}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[1.8rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5">
            <div className="flex items-center gap-3">
              <FileClock className="size-5 text-[#e4c673]" />
              <h2 className="text-base text-[#f2e2bd]">رویدادهای حسابرسی</h2>
            </div>
            <div className="mt-5 space-y-3">
              {article.auditEvents.map((event) => (
                <div
                  key={event.id}
                  className="border-s border-[#d7b95f]/24 ps-3"
                >
                  <p className="text-[11px] text-[#ebdbb7]">
                    {event.eventType}
                  </p>
                  <p className="mt-1 text-[10px] text-[#cbbd9d]/52">
                    {formatAdminDate(event.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {article.status === "ARCHIVED" ? (
            <section className="flex gap-3 rounded-[1.8rem] border border-red-300/16 bg-red-950/12 p-5 text-xs leading-7 text-red-100/80">
              <Archive className="mt-1 size-5 shrink-0" />
              این مقاله بایگانی شده است و در مجله و نقشهٔ سایت دیده نمی‌شود.
              برای بازگرداندن آن، وضعیت را به پیش‌نویس یا در انتظار تأیید تغییر
              دهید و سپس دوباره بازبینی کنید.
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function LanguagesIcon() {
  return <span className="text-lg text-[#e4c673]">A/آ</span>;
}
