import Link from "next/link";
import {
  Bot,
  CalendarClock,
  CheckCircle2,
  FilePenLine,
  ListChecks,
  Radar,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { notFound } from "next/navigation";

import { formatAdminDate, formatAdminMoney } from "@/lib/admin-format";
import { getStoreAutopilotOverview } from "@/lib/store-autopilot";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function priorityClass(priority: "high" | "medium" | "low") {
  return {
    high: "border-red-300/22 bg-red-950/18 text-red-100",
    medium: "border-amber-300/22 bg-amber-950/12 text-amber-100",
    low: "border-[#d7b95f]/18 bg-[#d7b95f]/[.045] text-[#ead7a0]",
  }[priority];
}

export default async function AdminAutomationPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();

  const overview = await getStoreAutopilotOverview();
  const latest = overview.latest;
  const summary = latest?.summary;
  const formatter = new Intl.NumberFormat("fa-IR");
  const scheduleReady = Boolean(latest && !latest.needsAttention);

  const cards = [
    {
      label: "گزارش خودکار روزانه",
      value: scheduleReady ? "فعال" : "نیازمند راه‌اندازی",
      detail: latest
        ? `آخرین گزارش: ${formatAdminDate(latest.updatedAt)}`
        : "هنوز گزارشی از زمان‌بند ثبت نشده است.",
      icon: CalendarClock,
      tone: scheduleReady ? "text-emerald-200" : "text-amber-100",
    },
    {
      label: "پیش‌نویس‌های قابل بازبینی",
      value: formatter.format(overview.contentAutopilot.pendingDrafts),
      detail: overview.contentAutopilot.enabled
        ? `حداکثر ${formatter.format(overview.contentAutopilot.dailyLimit)} پیش‌نویس واقعی در هر ۲۴ ساعت ساخته می‌شود.`
        : "تولید خودکار پیش‌نویس خاموش است.",
      icon: FilePenLine,
      tone: "text-[#efd37c]",
    },
    {
      label: "اقدام‌های امروز",
      value: formatter.format(overview.report.actions.length),
      detail: `${formatter.format(overview.report.actions.filter((action) => action.priority === "high").length)} مورد با اولویت بالا`,
      icon: ListChecks,
      tone: "text-sky-200",
    },
    {
      label: "سلامت محتوا و سئو",
      value: `${formatter.format(overview.report.content.score)} / ۱۰۰`,
      detail: `${formatter.format(overview.report.content.publishedArticleCount)} مقالهٔ عمومی`,
      icon: ShieldCheck,
      tone: "text-[#efd37c]",
    },
  ];

  return (
    <div className="mx-auto max-w-[1540px] space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#d7b95f]/20 bg-[linear-gradient(135deg,rgba(10,56,40,.95),rgba(3,24,17,.98))] px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:px-8">
        <div className="absolute -end-20 -top-24 size-72 rounded-full bg-[#d7b95f]/[.09] blur-[80px]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-[#e7c86f]">
              <span className="grid size-11 place-items-center rounded-2xl border border-[#e7c86f]/25 bg-[#d7b95f]/[.08]">
                <Bot className="size-5" />
              </span>
              <p className="text-[10px] uppercase tracking-[.28em] text-[#d9bd73]/70">
                eloria autopilot
              </p>
            </div>
            <h1 className="mt-5 text-2xl font-semibold text-[#f5e8c9] sm:text-3xl">
              خلبان خودکار فروشگاه
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[#d8c9aa]/72">
              نرخ‌ها، رزروهای منقضی، پیگیری‌های مشتری، سلامت محتوا و گزارش روزانه با زمان‌بند اجرا می‌شوند. سایت فقط پیش‌نویس محتوا می‌سازد؛ انتشار عمومی همیشه با تأیید شماست.
            </p>
          </div>
          <Link
            href={`/${locale}/admin/intelligence`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-[#d7b95f]/22 bg-black/10 px-5 text-xs text-[#ecd684] transition hover:bg-[#d7b95f]/10"
          >
            <Radar className="size-4" />
            مرکز هوشمندی
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article
              key={card.label}
              className="rounded-[1.7rem] border border-[#d7b95f]/17 bg-[#061c15]/86 p-5"
            >
              <div className="flex items-center justify-between gap-3">
                <Icon className={`size-5 ${card.tone}`} />
                <span className={`text-lg font-semibold ${card.tone}`}>
                  {card.value}
                </span>
              </div>
              <p className="mt-5 text-xs text-[#d8c9aa]/64">{card.label}</p>
              <p className="mt-2 text-[11px] leading-6 text-[#c5b694]/52">
                {card.detail}
              </p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.06fr_.94fr]">
        <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            {scheduleReady ? (
              <CheckCircle2 className="size-5 text-emerald-200" />
            ) : (
              <TriangleAlert className="size-5 text-amber-200" />
            )}
            <div>
              <h2 className="text-lg text-[#f2e2bd]">وضعیت زمان‌بند</h2>
              <p className="mt-1 text-xs text-[#cbbd9d]/62">
                {scheduleReady
                  ? "گزارش روزانه به‌تازگی توسط زمان‌بند ثبت شده است."
                  : "برای اجرای خودکار، زمان‌بند ویندوز یا cron هاست باید یک‌بار راه‌اندازی شود."}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-4">
              <p className="text-sm text-[#f0db9b]">هر ۱۵ دقیقه</p>
              <p className="mt-2 text-xs leading-6 text-[#c5b694]/55">
                نرخ فلز، آزادسازی سفارش منقضی، هشدار امنیتی و اعلان پیگیری مشتری.
              </p>
            </div>
            <div className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-4">
              <p className="text-sm text-[#f0db9b]">هر روز ساعت ۰۸:۱۵</p>
              <p className="mt-2 text-xs leading-6 text-[#c5b694]/55">
                سلامت سئو، پیش‌نویس محتوای قابل‌تأیید، گزارش روزانه و پاک‌سازی داده‌های منقضی.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#d7b95f]/12 bg-[#08241a]/70 p-4 text-xs leading-7 text-[#d7c7a4]/65">
            پیش‌نویس خودکار فقط از مشخصات واقعی محصولی که متن و تصویر کافی دارد ساخته می‌شود؛ قیمت یا موجودی را داخل مقاله قطعی اعلام نمی‌کند و بدون کلیک شما منتشر نمی‌شود.
          </div>
        </article>

        <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <CalendarClock className="size-5 text-[#e4c673]" />
            <div>
              <h2 className="text-lg text-[#f2e2bd]">خلاصهٔ آخرین گزارش</h2>
              <p className="mt-1 text-xs text-[#cbbd9d]/62">
                {latest
                  ? `به‌روزرسانی: ${formatAdminDate(latest.updatedAt)}`
                  : "بعد از نخستین اجرای چرخهٔ روزانه، گزارش این‌جا دیده می‌شود."}
              </p>
            </div>
          </div>

          {summary ? (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3">
                <p className="text-sm text-[#f0db9b]">
                  {formatAdminMoney(summary.finance.salesToman)}
                </p>
                <p className="mt-1 text-[11px] text-[#c5b694]/55">فروش ۳۰ روز</p>
              </div>
              <div className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3">
                <p className="text-sm text-[#f0db9b]">
                  {formatter.format(summary.content.score)} / ۱۰۰
                </p>
                <p className="mt-1 text-[11px] text-[#c5b694]/55">سلامت سئو</p>
              </div>
              <div className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3">
                <p className="text-sm text-[#f0db9b]">
                  {formatter.format(summary.operations.unavailableProducts)}
                </p>
                <p className="mt-1 text-[11px] text-[#c5b694]/55">موجودی نیازمند اقدام</p>
              </div>
              <div className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3">
                <p className="text-sm text-[#f0db9b]">
                  {formatter.format(latest.highPriorityCount)}
                </p>
                <p className="mt-1 text-[11px] text-[#c5b694]/55">اولویت بالا</p>
              </div>
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-[#d7b95f]/16 px-4 py-8 text-center text-sm leading-7 text-[#c5b694]/55">
              هنوز گزارش خودکاری ثبت نشده است؛ این یعنی لازم نیست چیزی دستی وارد کنید، فقط زمان‌بند یک‌بار باید فعال شود.
            </p>
          )}
        </article>
      </section>

      <section className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <ListChecks className="size-5 text-[#e4c673]" />
          <div>
            <h2 className="text-lg text-[#f2e2bd]">اولویت‌های واقعی همین لحظه</h2>
            <p className="mt-1 text-xs text-[#cbbd9d]/62">
              این بخش از دادهٔ زندهٔ فروشگاه ساخته می‌شود، نه از آمار نمایشی.
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3">
          {overview.report.actions.map((action) => (
            <div
              key={action.id}
              className={`rounded-2xl border p-4 ${priorityClass(action.priority)}`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{action.title}</p>
                  <p className="mt-2 text-xs leading-6 opacity-75">{action.detail}</p>
                </div>
                <Link
                  href={action.href.replace("/fa/", `/${locale}/`)}
                  className="shrink-0 rounded-full border border-current/25 px-3 py-2 text-xs"
                >
                  {action.hrefLabel}
                </Link>
              </div>
            </div>
          ))}
          {!overview.report.actions.length ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/18 bg-emerald-950/14 p-4 text-sm text-emerald-100">
              <CheckCircle2 className="size-5" />
              فعلاً مورد فوری در صف اقدام وجود ندارد.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
