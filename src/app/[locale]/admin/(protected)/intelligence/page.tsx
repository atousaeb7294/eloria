import Link from "next/link";
import { AlertTriangle, BarChart3, BrainCircuit, CheckCircle2, CircleDollarSign, Gauge, PackageSearch, Radar, ShieldCheck, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { formatAdminDate, formatAdminMoney } from "@/lib/admin-format";
import { getSiteIntelligence } from "@/lib/site-intelligence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function priorityClass(priority: "high" | "medium" | "low"): string {
  return {
    high: "border-red-300/22 bg-red-950/18 text-red-100",
    medium: "border-amber-300/22 bg-amber-950/12 text-amber-100",
    low: "border-[#d7b95f]/18 bg-[#d7b95f]/[.045] text-[#ead7a0]",
  }[priority];
}

function formatVital(name: string, value: number | null): string {
  if (value === null) return "—";
  if (name === "CLS") return new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 3 }).format(value);
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(value)} ms`;
}

function formatPercent(value: number | null): string {
  if (value === null) return "—";
  return `${new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(value)}٪`;
}

export default async function AdminIntelligencePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "fa" && locale !== "en") notFound();
  const report = await getSiteIntelligence();
  const formatter = new Intl.NumberFormat("fa-IR");

  const cards = [
    { icon: ShieldCheck, label: "آمادگی انتشار", value: `${formatter.format(report.environment.passed)} / ${formatter.format(report.environment.total)}`, detail: "کنترل‌های الزامی محیط Production" },
    { icon: CircleDollarSign, label: "فروش ۳۰ روز", value: formatAdminMoney(report.finance.salesToman), detail: `${formatter.format(report.finance.orderCount)} سفارش پرداخت‌شده/عملیاتی` },
    { icon: Sparkles, label: "سلامت محتوا و سئو", value: `${formatter.format(report.content.score)} / ۱۰۰`, detail: `${formatter.format(report.content.publishedArticleCount)} مقالهٔ عمومی` },
    { icon: PackageSearch, label: "صف موجودی", value: formatter.format(report.operations.unavailableProducts), detail: "محصول قابل‌نمایش بدون موجودی قابل سفارش" },
  ];

  return (
    <div className="mx-auto max-w-[1540px] space-y-7">
      <section className="relative overflow-hidden rounded-[2rem] border border-[#d7b95f]/20 bg-[linear-gradient(135deg,rgba(10,56,40,.95),rgba(3,24,17,.98))] px-6 py-7 shadow-[0_24px_70px_rgba(0,0,0,.28)] sm:px-8">
        <div className="absolute -end-20 -top-24 size-72 rounded-full bg-[#d7b95f]/[.09] blur-[80px]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3 text-[#e7c86f]"><span className="grid size-11 place-items-center rounded-2xl border border-[#e7c86f]/25 bg-[#d7b95f]/[.08]"><BrainCircuit className="size-5" /></span><p className="text-[10px] uppercase tracking-[.28em] text-[#d9bd73]/70">intelligence center</p></div>
            <h1 className="mt-5 text-2xl font-semibold text-[#f5e8c9] sm:text-3xl">مرکز هوشمندی عملیات</h1>
            <p className="mt-3 max-w-3xl text-sm leading-8 text-[#d8c9aa]/72">این صفحه از فروش، پرداخت، نرخ، موجودی، محتوا و سنجش رضایتی دادهٔ واقعی می‌خواند. هیچ امتیاز یا توصیه‌ای بدون داده ساخته نمی‌شود.</p>
          </div>
          <p className="text-xs text-[#c8bb98]/55">آخرین محاسبه: {formatAdminDate(report.generatedAt)}</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return <article key={card.label} className="rounded-[1.7rem] border border-[#d7b95f]/17 bg-[#061c15]/86 p-5"><div className="flex items-center justify-between"><Icon className="size-5 text-[#e4c673]" /><span className="text-xl font-semibold text-[#f0db9b]">{card.value}</span></div><p className="mt-5 text-xs text-[#d8c9aa]/64">{card.label}</p><p className="mt-2 text-[11px] leading-6 text-[#c5b694]/52">{card.detail}</p></article>;
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.12fr_.88fr]">
        <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
          <div className="flex items-center gap-3"><Radar className="size-5 text-[#e4c673]" /><div><h2 className="text-lg text-[#f2e2bd]">صف اقدام هوشمند</h2><p className="mt-1 text-xs text-[#cbbd9d]/62">اولویت‌ها از وضعیت واقعی فروشگاه مرتب شده‌اند.</p></div></div>
          <div className="mt-5 space-y-3">
            {report.actions.map((action) => <div key={action.id} className={`rounded-2xl border p-4 ${priorityClass(action.priority)}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex items-center gap-2"><AlertTriangle className="size-4 shrink-0" /><p className="text-sm font-medium">{action.title}</p></div><p className="mt-2 text-xs leading-6 opacity-75">{action.detail}</p></div><Link href={action.href.replace("/fa/", `/${locale}/`)} className="shrink-0 rounded-full border border-current/25 px-3 py-2 text-xs">{action.hrefLabel}</Link></div></div>)}
            {!report.actions.length ? <div className="flex items-center gap-3 rounded-2xl border border-emerald-300/18 bg-emerald-950/14 p-4 text-sm text-emerald-100"><CheckCircle2 className="size-5" />صف اقدام فوری خالی است.</div> : null}
          </div>
        </article>

        <div className="space-y-6">
          <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
            <div className="flex items-center gap-3"><Radar className="size-5 text-[#e4c673]" /><div><h2 className="text-lg text-[#f2e2bd]">فرصت‌های تبدیل ۳۰ روز</h2><p className="mt-1 text-xs text-[#cbbd9d]/62">محصولاتی که دیده شده‌اند اما هنوز فروش نهایی ثبت نکرده‌اند.</p></div></div>
            <div className="mt-5 space-y-3">
              {report.marketing.opportunities.length ? report.marketing.opportunities.map((item) => (
                <Link key={item.slug} href={`/${locale}/products/${item.slug}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3 transition hover:border-[#d7b95f]/28">
                  <span className="min-w-0 truncate text-xs text-[#eadbb5]">{item.slug}</span>
                  <span className="shrink-0 text-[11px] text-[#c5b694]/60">{formatter.format(item.views)} بازدید · {formatter.format(item.sales)} فروش</span>
                </Link>
              )) : <p className="text-xs leading-6 text-emerald-100/70">در داده‌های فعلی فرصت پرریسک بدون فروش دیده نشد.</p>}
            </div>
          </article>
          <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
            <div className="flex items-center gap-3"><Sparkles className="size-5 text-[#e4c673]" /><div><h2 className="text-lg text-[#f2e2bd]">شتاب توجه ۷ روزه</h2><p className="mt-1 text-xs text-[#cbbd9d]/62">مقایسهٔ بازدید این هفته با هفت روز قبل برای تشخیص آثار رو به رشد.</p></div></div>
            <div className="mt-5 space-y-3">
              {report.marketing.momentum.length ? report.marketing.momentum.map((item) => (
                <Link key={item.slug} href={`/${locale}/products/${item.slug}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3 transition hover:border-[#d7b95f]/28">
                  <span className="min-w-0 truncate text-xs text-[#eadbb5]">{item.slug}</span>
                  <span className={item.growthPercent >= 0 ? "text-[11px] text-emerald-100/70" : "text-[11px] text-amber-100/65"}>{item.growthPercent >= 0 ? "+" : ""}{new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(item.growthPercent)}٪ · {formatter.format(item.currentViews)} بازدید</span>
                  <span className="col-span-2 text-[10px] text-[#c5b694]/42">هفته قبل: {formatter.format(item.previousViews)} · فروش ۷ روز: {formatter.format(item.sales)}</span>
                </Link>
              )) : <p className="text-xs leading-6 text-[#c5b694]/55">برای تشخیص شتاب، هنوز دادهٔ رضایتی کافی جمع نشده است.</p>}
            </div>
          </article>
          <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
            <div className="flex items-center gap-3"><BarChart3 className="size-5 text-[#e4c673]" /><div><h2 className="text-lg text-[#f2e2bd]">قیف رضایتی ۳۰ روز</h2><p className="mt-1 text-xs text-[#cbbd9d]/62">تعداد رویدادهای بدون دادهٔ هویتی؛ فقط پس از اجازهٔ کاربر.</p></div></div>
            <div className="mt-5 grid grid-cols-2 gap-3">{[["بازدید", "page_view"], ["محصول", "view_item"], ["جست‌وجو", "search"], ["فیلتر", "catalog_filter"], ["منتخب", "favorite"], ["سبد", "view_cart"], ["افزودن به سبد", "add_to_cart"], ["شروع پرداخت", "begin_checkout"], ["کد موفق", "coupon_applied"], ["کد ناموفق", "coupon_rejected"]].map(([label, key]) => <div key={key} className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3"><p className="text-lg text-[#f0db9b]">{formatter.format(report.measurement.eventCounts[key] ?? 0)}</p><p className="mt-1 text-[11px] text-[#c5b694]/55">{label}</p></div>)}<div className="rounded-2xl border border-emerald-300/14 bg-emerald-950/12 p-3"><p className="text-lg text-emerald-100">{formatter.format(report.marketing.paidOrderCount)}</p><p className="mt-1 text-[11px] text-emerald-100/55">خرید نهایی</p></div></div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-xl border border-[#d7b95f]/10 bg-black/10 p-3"><p className="text-sm text-[#f0db9b]">{formatPercent(report.marketing.funnel.viewToCartPercent)}</p><p className="mt-1 text-[10px] text-[#c5b694]/50">محصول → افزودن به سبد</p></div>
              <div className="rounded-xl border border-[#d7b95f]/10 bg-black/10 p-3"><p className="text-sm text-[#f0db9b]">{formatPercent(report.marketing.funnel.cartToCheckoutPercent)}</p><p className="mt-1 text-[10px] text-[#c5b694]/50">سبد → شروع پرداخت</p></div>
              <div className="rounded-xl border border-[#d7b95f]/10 bg-black/10 p-3"><p className="text-sm text-[#f0db9b]">{formatPercent(report.marketing.funnel.checkoutToPaidPercent)}</p><p className="mt-1 text-[10px] text-[#c5b694]/50">شروع پرداخت → خرید</p></div>
            </div>
            <p className="mt-4 text-[11px] leading-6 text-[#c5b694]/52">این نرخ‌ها برای تصمیم بازاریابی تقریبی‌اند و از شمارش ۳۰ روزه ساخته می‌شوند؛ وضعیت سنجش: {report.measurement.enabled ? "فعال و نیازمند رضایت" : "خاموش"}.</p>
          </article>
          <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
            <div className="flex items-center gap-3"><BarChart3 className="size-5 text-[#e4c673]" /><div><h2 className="text-lg text-[#f2e2bd]">منابع فروش ۳۰ روز</h2><p className="mt-1 text-xs text-[#cbbd9d]/62">UTM سفارش‌های نهایی، بدون کوکی تبلیغاتی و بدون وابستگی به سرویس پولی.</p></div></div>
            <div className="mt-5 space-y-3">
              {report.marketing.topMarketingSources.length ? report.marketing.topMarketingSources.map((item) => (
                <div key={item.source} className="flex items-center justify-between gap-3 rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3">
                  <span className="min-w-0 truncate text-xs text-[#eadbb5]">{item.source}</span>
                  <span className="shrink-0 text-[11px] text-[#c5b694]/60">{formatter.format(item.orders)} سفارش · {formatAdminMoney(item.salesToman)}</span>
                </div>
              )) : <p className="text-xs leading-6 text-[#c5b694]/55">هنوز سفارش پرداخت‌شده با UTM ثبت نشده است.</p>}
            </div>
          </article>

          <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
            <div className="flex items-center gap-3"><BrainCircuit className="size-5 text-[#e4c673]" /><div><h2 className="text-lg text-[#f2e2bd]">تقسیم‌بندی هوشمند مشتریان</h2><p className="mt-1 text-xs text-[#cbbd9d]/62">RFM زنده بر پایهٔ تازگی خرید، تکرار خرید و ارزش نسبی سفارش‌ها؛ بدون جدول یا Migration جدید.</p></div></div>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[["VIP", report.marketing.customerSegments.vip], ["وفادار", report.marketing.customerSegments.loyal], ["جدید", report.marketing.customerSegments.newCustomers], ["در معرض ریزش", report.marketing.customerSegments.atRisk], ["فعال", report.marketing.customerSegments.active], ["کل مشتریان تحلیلی", report.marketing.customerSegments.total]].map(([label, value]) => <div key={String(label)} className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3"><p className="text-lg text-[#f0db9b]">{formatter.format(Number(value))}</p><p className="mt-1 text-[11px] text-[#c5b694]/55">{label}</p></div>)}
            </div>
          </article>
          <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6">
            <div className="flex items-center gap-3"><Sparkles className="size-5 text-[#e4c673]" /><div><h2 className="text-lg text-[#f2e2bd]">کیفیت صفحه‌های محصول</h2><p className="mt-1 text-xs text-[#cbbd9d]/62">امتیاز بر اساس توضیح، داستان اثر، وزن/عیار، تصویر و alt؛ اجرت، سود و مالیات در این امتیاز عمومی نمایش داده نمی‌شوند.</p></div></div>
            <div className="mt-5 flex items-center justify-between rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-4"><span className="text-xs text-[#c5b694]/60">میانگین کیفیت</span><strong className="text-xl text-[#f0db9b]">{formatter.format(report.marketing.productQuality.averageScore)} / ۱۰۰</strong></div>
            <div className="mt-3 space-y-2">
              {report.marketing.productQuality.needsAttention.length ? report.marketing.productQuality.needsAttention.map((item) => <Link key={item.slug} href={`/${locale}/products/${item.slug}`} className="flex items-center justify-between gap-3 rounded-xl border border-[#d7b95f]/10 px-3 py-2.5 text-xs transition hover:border-[#d7b95f]/28"><span className="min-w-0 truncate text-[#eadbb5]">{item.nameFa}</span><span className="shrink-0 text-[#c5b694]/55">{formatter.format(item.score)} / ۱۰۰</span></Link>) : <p className="text-xs text-emerald-100/70">محصول کم‌کیفیت در صف اول دیده نشد.</p>}
            </div>
          </article>
          <article className="rounded-[1.9rem] border border-[#d7b95f]/18 bg-[#061c15]/86 p-5 sm:p-6"><div className="flex items-center gap-3"><Gauge className="size-5 text-[#e4c673]" /><div><h2 className="text-lg text-[#f2e2bd]">سرعت واقعی کاربران</h2><p className="mt-1 text-xs text-[#cbbd9d]/62">صدک ۷۵ از حداکثر ۵۰۰۰ نمونهٔ رضایتی در ۳۰ روز.</p></div></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">{report.measurement.vitals.map((vital) => <div key={vital.name} className="rounded-2xl border border-[#d7b95f]/12 bg-black/15 p-3"><p className="text-sm text-[#f0db9b]">{formatVital(vital.name, vital.p75)}</p><p className="mt-1 text-[11px] text-[#c5b694]/55">{vital.name} · {formatter.format(vital.samples)} نمونه</p></div>)}</div></article>
        </div>
      </section>
    </div>
  );
}
