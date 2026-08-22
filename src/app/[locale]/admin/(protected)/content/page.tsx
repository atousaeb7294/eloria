import Link from "next/link";

import {
  AlertTriangle,
  BookMarked,
  CheckCircle2,
  FilePenLine,
  FilePlus2,
  Gauge,
  ImageOff,
  Languages,
  ListChecks,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { notFound } from "next/navigation";

import {
  createManualArticleAction,
  createProductArticleDraftAction,
} from "@/app/[locale]/admin/(protected)/content/actions";
import { formatAdminDate } from "@/lib/admin-format";
import { getAdminContentIndex } from "@/lib/content-articles";
import { getContentSeoHealth } from "@/lib/content-seo-health";
import { articleOriginLabels, articleStatusLabels } from "@/lib/content-studio";

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

function statusTone(status: keyof typeof articleStatusLabels): string {
  return {
    DRAFT: "border-white/10 bg-white/[0.045] text-[#d7c8aa]",
    IN_REVIEW: "border-amber-300/20 bg-amber-300/[0.08] text-amber-100",
    PUBLISHED: "border-emerald-300/20 bg-emerald-300/[0.08] text-emerald-100",
    ARCHIVED: "border-red-300/15 bg-red-300/[0.06] text-red-100/80",
  }[status];
}

export default async function AdminContentPage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    error?: string | string[];
  }>;
}) {
  const { locale } = await params;

  if (locale !== "fa" && locale !== "en") {
    notFound();
  }

  const [index, health, query] = await Promise.all([
    getAdminContentIndex(),
    getContentSeoHealth(),
    searchParams,
  ]);
  const [articles, products, snapshots] = index;
  const error = singleValue(query.error)?.slice(0, 500);
  const productsWithLiveDraft = new Set(
    articles
      .filter(
        (article) => article.status !== "ARCHIVED" && article.sourceProductId,
      )
      .map((article) => article.sourceProductId),
  );
  const productDraftAction = createProductArticleDraftAction.bind(null, locale);
  const manualDraftAction = createManualArticleAction.bind(null, locale);

  return (
    <div className="mx-auto max-w-[1540px] space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#d7b95f]/20 bg-[linear-gradient(135deg,rgba(10,56,40,0.95),rgba(3,24,17,0.98))] px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,0.28)] sm:px-8">
        <div className="absolute -end-20 -top-24 size-72 rounded-full bg-[#d7b95f]/[0.09] blur-[80px]" />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-[#e7c86f]">
              <span className="grid size-11 place-items-center rounded-2xl border border-[#e7c86f]/25 bg-[#d7b95f]/[0.08]">
                <Sparkles className="size-5" />
              </span>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[#d9bd73]/70">
                Content Studio
              </p>
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-[#f5e8c9] sm:text-3xl">
              محتوا و سئوی قابل‌اندازه‌گیری
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[#d8c9aa]/72">
              پیش‌نویس‌ها از دادهٔ واقعی محصول ساخته می‌شوند، اما مقاله فقط با
              تأیید شما عمومی می‌شود. سلامت سئو از دادهٔ فروشگاه محاسبه می‌شود؛
              نه با امتیاز نمایشی.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form action={manualDraftAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl border border-[#e2c36d]/35 bg-[#d9b85f]/[0.08] px-4 py-3 text-xs text-[#f0d990] transition hover:-translate-y-0.5 hover:border-[#efd17a]/65 hover:bg-[#d9b85f]/[0.13]"
              >
                <FilePlus2 className="size-4" />
                پیش‌نویس دستی
              </button>
            </form>
            <a
              href="#product-draft"
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-3 text-xs text-[#e2d5b8] transition hover:border-[#d9b85f]/32 hover:bg-white/[0.06]"
            >
              <BookMarked className="size-4" />
              ساخت از محصول
            </a>
          </div>
        </div>
      </section>

      {error ? (
        <div className="flex items-start gap-3 rounded-2xl border border-red-300/20 bg-red-950/20 px-5 py-4 text-sm text-red-100">
          <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-[1.7rem] border border-[#d7b95f]/17 bg-[#061c15]/86 p-5">
          <div className="flex items-center justify-between">
            <Gauge className="size-5 text-[#e4c673]" />
            <span
              className={[
                "text-2xl font-semibold",
                scoreTone(health.overallScore),
              ].join(" ")}
            >
              {new Intl.NumberFormat("fa-IR").format(health.overallScore)}
            </span>
          </div>
          <p className="mt-5 text-xs text-[#d8c9aa]/64">
            امتیاز سلامت محتوا و سئو
          </p>
          <p className="mt-2 text-[11px] leading-6 text-[#c5b694]/52">
            بر پایهٔ توضیحات، alt تصویر، مقاله‌های منتشرشده و تازگی محتوا
          </p>
        </article>

        <article className="rounded-[1.7rem] border border-[#d7b95f]/17 bg-[#061c15]/86 p-5">
          <div className="flex items-center justify-between">
            <BookMarked className="size-5 text-[#e4c673]" />
            <span className="text-2xl font-semibold text-[#f0db9b]">
              {new Intl.NumberFormat("fa-IR").format(
                health.publishedArticleCount,
              )}
            </span>
          </div>
          <p className="mt-5 text-xs text-[#d8c9aa]/64">مقالهٔ منتشرشده</p>
          <p className="mt-2 text-[11px] leading-6 text-[#c5b694]/52">
            هر مقاله در هر دو زبان، در نقشهٔ سایت و دادهٔ ساختاریافته قرار
            می‌گیرد.
          </p>
        </article>

        <article className="rounded-[1.7rem] border border-[#d7b95f]/17 bg-[#061c15]/86 p-5">
          <div className="flex items-center justify-between">
            <Languages className="size-5 text-[#e4c673]" />
            <span className="text-2xl font-semibold text-[#f0db9b]">
              {new Intl.NumberFormat("fa-IR").format(
                health.productsMissingDescription,
              )}
            </span>
          </div>
          <p className="mt-5 text-xs text-[#d8c9aa]/64">محصول با توضیح ناقص</p>
          <p className="mt-2 text-[11px] leading-6 text-[#c5b694]/52">
            محصول فعال باید توضیح فارسی و انگلیسی قابل‌استفاده داشته باشد.
          </p>
        </article>

        <article className="rounded-[1.7rem] border border-[#d7b95f]/17 bg-[#061c15]/86 p-5">
          <div className="flex items-center justify-between">
            <ImageOff className="size-5 text-[#e4c673]" />
            <span className="text-2xl font-semibold text-[#f0db9b]">
              {new Intl.NumberFormat("fa-IR").format(
                health.productsMissingImageAlt,
              )}
            </span>
          </div>
          <p className="mt-5 text-xs text-[#d8c9aa]/64">تصویر با alt ناقص</p>
          <p className="mt-2 text-[11px] leading-6 text-[#c5b694]/52">
            تصویر اصلی و متن جایگزین دقیق، دسترس‌پذیری و درک صفحه را بهتر
            می‌کند.
          </p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div
          id="product-draft"
          className="scroll-mt-28 rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#d7b95f]/22 bg-[#d7b95f]/[0.06] text-[#e4c673]">
              <Sparkles className="size-5" />
            </span>
            <div>
              <h2 className="text-lg text-[#f2e2bd]">
                پیش‌نویس هوشمند از محصول واقعی
              </h2>
              <p className="mt-1 text-xs leading-6 text-[#cbbd9d]/62">
                عنوان، توضیح، مشخصات ثبت‌شده و تصویر محصول به یک پیش‌نویس
                دو‌زبانه تبدیل می‌شوند. قیمت و موجودی قطعی در متن ادعا نمی‌شود.
              </p>
            </div>
          </div>

          <form
            action={productDraftAction}
            className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]"
          >
            <select
              name="productId"
              required
              defaultValue=""
              className="min-h-12 rounded-xl border border-[#d7b95f]/20 bg-[#041911] px-4 text-sm text-[#eadfbf] outline-none transition focus:border-[#e4c773]/55"
            >
              <option value="" disabled>
                یک محصول فعال انتخاب کنید…
              </option>
              {products.map((product) => {
                const alreadyDrafted = productsWithLiveDraft.has(product.id);

                return (
                  <option
                    key={product.id}
                    value={product.id}
                    disabled={alreadyDrafted}
                  >
                    {product.nameFa} — {product.nameEn}
                    {alreadyDrafted ? " (مقاله دارد)" : ""}
                  </option>
                );
              })}
            </select>
            <button
              type="submit"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#dfc16c]/35 bg-[#d9b85f]/[0.08] px-5 text-xs text-[#f0d990] transition hover:border-[#efd17a]/65 hover:bg-[#d9b85f]/[0.13]"
            >
              <FilePenLine className="size-4" />
              ساخت و بازبینی
            </button>
          </form>
        </div>

        <div className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <ListChecks className="size-5 text-[#e4c673]" />
              <h2 className="text-lg text-[#f2e2bd]">اولویت‌های امروز</h2>
            </div>
            <span className="text-[10px] text-[#cbbd9d]/55">زنده</span>
          </div>
          <div className="mt-5 space-y-3">
            {health.issues.length > 0 ? (
              health.issues.slice(0, 4).map((issue) => (
                <article
                  key={issue.id}
                  className="rounded-xl border border-white/[0.07] bg-black/10 p-3.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={[
                        "size-2 rounded-full",
                        issue.severity === "HIGH"
                          ? "bg-red-300"
                          : issue.severity === "MEDIUM"
                            ? "bg-amber-300"
                            : "bg-emerald-300",
                      ].join(" ")}
                    />
                    <h3 className="text-xs text-[#eddfbe]">{issue.title}</h3>
                  </div>
                  <p className="mt-2 text-[11px] leading-6 text-[#cbbd9d]/60">
                    {issue.detail}
                  </p>
                  <p className="mt-1 text-[11px] leading-6 text-[#e0c779]/76">
                    {issue.action}
                  </p>
                </article>
              ))
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-4 text-sm text-emerald-100">
                <CheckCircle2 className="size-5" />
                فعلاً مورد مهمی برای رسیدگی ندارید.
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg text-[#f2e2bd]">مقاله‌ها و صف بازبینی</h2>
            <p className="mt-1 text-xs text-[#cbbd9d]/62">
              تغییر وضعیت و انتشار هر مقاله در گزارش حسابرسی محتوا ثبت می‌شود.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-[11px] text-[#d9c17f]/62">
            <RefreshCw className="size-3.5" />
            {articles.length} رکورد اخیر
          </span>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-right text-xs">
            <thead className="border-b border-[#d7b95f]/14 text-[#d1b979]/62">
              <tr>
                <th className="px-3 py-3 font-medium">مقاله</th>
                <th className="px-3 py-3 font-medium">وضعیت</th>
                <th className="px-3 py-3 font-medium">مبنا</th>
                <th className="px-3 py-3 font-medium">آخرین تغییر</th>
                <th className="px-3 py-3 font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => (
                <tr
                  key={article.id}
                  className="border-b border-white/[0.055] text-[#ded1b5]/76 last:border-b-0"
                >
                  <td className="px-3 py-4">
                    <p className="font-medium text-[#f0dfbb]">
                      {article.titleFa}
                    </p>
                    <p className="mt-1 text-[10px] text-[#c4b694]/52">
                      /{article.slug}
                    </p>
                  </td>
                  <td className="px-3 py-4">
                    <span
                      className={[
                        "inline-flex rounded-full border px-2.5 py-1 text-[10px]",
                        statusTone(article.status),
                      ].join(" ")}
                    >
                      {articleStatusLabels[article.status]}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-[11px]">
                    <p>{articleOriginLabels[article.origin]}</p>
                    {article.sourceProduct ? (
                      <p className="mt-1 text-[#c4b694]/52">
                        {article.sourceProduct.nameFa}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-4 text-[11px] text-[#c4b694]/62">
                    {formatAdminDate(article.updatedAt)}
                  </td>
                  <td className="px-3 py-4">
                    <Link
                      href={`/${locale}/admin/content/${article.id}`}
                      className="inline-flex rounded-lg border border-[#d7b95f]/22 px-3 py-2 text-[11px] text-[#e8cf88] transition hover:border-[#e8cf88]/52 hover:bg-[#d7b95f]/[0.07]"
                    >
                      بازبینی
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {snapshots.length > 0 ? (
        <section className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/72 p-5 sm:p-6">
          <h2 className="text-base text-[#f2e2bd]">روند ثبت‌شدهٔ سلامت سئو</h2>
          <p className="mt-1 text-xs text-[#cbbd9d]/62">
            هر بار اجرای کار روزانه، فقط یک تصویر غیرقابل‌ویرایش از وضعیت همان
            روز ثبت می‌کند.
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {snapshots.map((snapshot) => (
              <article
                key={snapshot.recordedFor.toISOString()}
                className="rounded-xl border border-white/[0.07] bg-black/10 p-3"
              >
                <p className="text-[10px] text-[#cbbd9d]/56">
                  {new Intl.DateTimeFormat("fa-IR", {
                    dateStyle: "short",
                  }).format(snapshot.recordedFor)}
                </p>
                <p
                  className={[
                    "mt-2 text-xl font-semibold",
                    scoreTone(snapshot.overallScore),
                  ].join(" ")}
                >
                  {snapshot.overallScore}
                </p>
                <p className="mt-1 text-[10px] text-[#cbbd9d]/50">
                  {snapshot.publishedArticleCount} مقاله ·{" "}
                  {snapshot.productsMissingDescription +
                    snapshot.productsMissingImageAlt}{" "}
                  ایراد کاتالوگ
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
