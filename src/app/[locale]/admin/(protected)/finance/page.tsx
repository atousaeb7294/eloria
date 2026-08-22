import Link from "next/link";

import {
  AlertTriangle,
  BarChart3,
  Banknote,
  CircleDollarSign,
  Download,
  FilePlus2,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingDown,
  TrendingUp,
  WalletCards,
} from "lucide-react";

import {
  notFound,
} from "next/navigation";

import {
  formatAdminDate,
  formatAdminMoney,
} from "@/lib/admin-format";
import {
  getAdminFinanceReport,
} from "@/lib/admin-finance";
import {
  saveFinanceExpenseAction,
  voidFinanceExpenseAction,
} from "@/app/[locale]/admin/(protected)/finance/actions";
import {
  financeExpenseCategories,
  getFinanceExpenseCategoryLabel,
} from "@/lib/finance-expense";
import {
  financePeriods,
  formatFinancePeriod,
  parseFinancePeriod,
  percentageChange,
  percentageOf,
  type FinancePeriod,
} from "@/lib/finance-analytics";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

function singleValue(
  value:
    | string
    | string[]
    | undefined,
): string | undefined {
  return Array.isArray(value)
    ? value[0]
    : value;
}

function formatPercentage(
  value: number,
): string {
  return `${new Intl.NumberFormat(
    "fa-IR",
    {
      maximumFractionDigits: 1,
    },
  ).format(value)}٪`;
}

function periodHref(
  locale: string,
  period: FinancePeriod,
): string {
  return `/${locale}/admin/finance?period=${period}`;
}

function exportHref(
  locale: string,
  period: FinancePeriod,
  mode: "ledger" | "audit",
): string {
  return `/${locale}/admin/finance/export?period=${period}&mode=${mode}`;
}

function changeSummary(
  change: number | null,
  currentValue: bigint,
): string {
  if (
    change === null
  ) {
    return currentValue > 0n
      ? "نخستین فروش در این بازه"
      : "هنوز مبنای مقایسه‌ای نیست";
  }

  if (
    change === 0
  ) {
    return "بدون تغییر نسبت به بازه قبل";
  }

  return `${formatPercentage(
    Math.abs(change),
  )} ${change > 0 ? "رشد" : "کاهش"} نسبت به بازه قبل`;
}

function formatSignedMoney(
  value: bigint,
): string {
  if (value === 0n) {
    return formatAdminMoney(value);
  }

  return `${value > 0n ? "+" : "−"}${formatAdminMoney(
    value > 0n ? value : -value,
  )}`;
}

type InsightTone =
  | "emerald"
  | "gold"
  | "amber"
  | "red"
  | "slate";

export default async function AdminFinancePage({
  params,
  searchParams,
}: {
  params: Promise<{
    locale: string;
  }>;
  searchParams: Promise<{
    period?: string | string[];
    expenseSaved?: string | string[];
    expenseVoided?: string | string[];
    expenseError?: string | string[];
  }>;
}) {
  const {
    locale,
  } = await params;

  if (
    locale !== "fa" &&
    locale !== "en"
  ) {
    notFound();
  }

  const query =
    await searchParams;

  const period =
    parseFinancePeriod(
      singleValue(
        query.period,
      ),
    );

  const report =
    await getAdminFinanceReport(
      period,
    );

  const salesChange =
    percentageChange(
      report.salesToman,
      report.previousSalesToman,
    );

  const marginRate =
    percentageOf(
      report.priceMarginToman,
      report.salesToman,
    );

  const refundRate =
    percentageOf(
      report.refundedToman,
      report.receivedToman,
    );

  const maxDailyRevenue =
    report.dailySales.reduce(
      (maximum, point) =>
        point.revenueToman >
        maximum
          ? point.revenueToman
          : maximum,
      0n,
    );

  const firstDay =
    report.dailySales[0];

  const lastDay =
    report.dailySales[
      report.dailySales.length - 1
    ];

  const topProduct =
    report.topProducts[0];

  const expenseDate =
    report.range.dayKeys.at(-1) ?? "";

  const expenseError =
    singleValue(
      query.expenseError,
    )?.slice(0, 400);

  const reconciliationIsClear =
    report.reconciliation.mismatchCount === 0 &&
    report.reconciliation.paymentReview.count === 0;

  const insights: Array<{
    tone: InsightTone;
    title: string;
    body: string;
  }> = [
    report.salesToman > 0n
      ? {
          tone: "emerald",
          title:
            salesChange !== null &&
            salesChange < 0
              ? "فروش نیاز به توجه دارد"
              : "روند فروش",
          body: changeSummary(
            salesChange,
            report.salesToman,
          ),
        }
      : {
          tone: "amber",
          title: "فروش قطعی ثبت نشده",
          body: "برای نمایش تحلیل، باید حداقل یک پرداخت تأییدشده در این بازه وجود داشته باشد.",
        },
    reconciliationIsClear
      ? {
          tone: "emerald",
          title: "تطبیق پرداخت پاک است",
          body: `${new Intl.NumberFormat("fa-IR").format(report.reconciliation.inspectedOrderCount)} سفارش پرداخت‌شده با مبلغ ثبت‌شده در درگاه تطبیق داده شد.`,
        }
      : {
          tone: "red",
          title: "مغایرت پرداخت نیازمند رسیدگی است",
          body: `${new Intl.NumberFormat("fa-IR").format(report.reconciliation.mismatchCount)} سفارش دارای اختلاف و ${new Intl.NumberFormat("fa-IR").format(report.reconciliation.paymentReview.count)} پرداخت در صف بررسی است.`,
        },
    report.expenses.count > 0
      ? {
          tone: "gold",
          title: "دفتر هزینه به‌روز است",
          body: `${new Intl.NumberFormat("fa-IR").format(report.expenses.count)} سند هزینهٔ فعال به ارزش ${formatAdminMoney(report.expenses.totalToman)} در این بازه ثبت شده است.`,
        }
      : {
          tone: "amber",
          title: "هزینه‌ای ثبت نشده",
          body: "تا وقتی خرید، ارسال، حقوق و هزینه‌های بیرونی ثبت نشوند، جریان نقدیِ پس از هزینه کامل نیست.",
        },
    topProduct
      ? {
          tone: "gold",
          title: "محصول پیشتاز",
          body: `${topProduct.name} با ${new Intl.NumberFormat("fa-IR").format(topProduct.quantity)} عدد و ${formatAdminMoney(topProduct.revenueToman)} فروش.`,
        }
      : {
          tone: "slate",
          title: "دادهٔ محصول کافی نیست",
          body: "پس از پرداخت سفارش‌ها، پرفروش‌ترین محصولات اینجا ظاهر می‌شوند.",
        },
    refundRate &&
    refundRate > 0
      ? {
          tone: refundRate >= 5
            ? "red"
            : "amber",
          title: "نرخ بازپرداخت",
          body: `${formatPercentage(refundRate)} از دریافتی این بازه بازپرداخت شده است.`,
        }
      : {
          tone: "slate",
          title: "بازپرداختی در این بازه نیست",
          body: "اگر بازپرداخت انجام شود، فقط پس از ثبت شماره مرجع بانکی در محاسبات وارد می‌شود.",
        },
  ];

  const insightTone: Record<
    InsightTone,
    string
  > = {
    emerald:
      "border-emerald-300/15 bg-emerald-950/15 text-emerald-100",
    gold:
      "border-[#d1b45d]/18 bg-[#d1b45d]/8 text-[#f1d98a]",
    amber:
      "border-amber-300/15 bg-amber-950/15 text-amber-100",
    red:
      "border-red-300/15 bg-red-950/15 text-red-100",
    slate:
      "border-white/10 bg-white/[0.025] text-[#d9caa9]",
  };

  const saveExpense =
    saveFinanceExpenseAction.bind(
      null,
      locale,
    );

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-xs tracking-[0.25em] text-[#b99e4f]">
            دفتر مالی و حسابرسی
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-[#f7e4b6] sm:text-3xl">
            حسابداری عملیاتی الوریا
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-[#9f9279]">
            فروش و پرداخت از سفارش‌های واقعی خوانده می‌شود؛ هزینه‌ها فقط با ثبت سند وارد می‌شوند و هیچ سندی از پنل حذف نمی‌شود.
          </p>
        </div>

        <nav
          aria-label="بازهٔ گزارش"
          className="flex w-full flex-wrap gap-1.5 rounded-2xl border border-[#d0b359]/15 bg-[#041d15]/82 p-1.5 xl:w-fit"
        >
          {financePeriods.map(
            option => (
              <Link
                key={option}
                href={periodHref(
                  locale,
                  option,
                )}
                aria-current={
                  period === option
                    ? "page"
                    : undefined
                }
                className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2.5 text-center text-sm transition sm:flex-none sm:px-4 ${period === option ? "bg-[#d2b55f] font-semibold text-[#10251c]" : "text-[#cdbf9f] hover:bg-white/5 hover:text-[#f0d981]"}`}
              >
                {formatFinancePeriod(option)}
              </Link>
            ),
          )}
        </nav>
      </header>

      {expenseError ? (
        <div
          role="alert"
          className="rounded-2xl border border-red-300/20 bg-red-950/25 px-4 py-3 text-sm leading-7 text-red-100"
        >
          {expenseError}
        </div>
      ) : null}

      {singleValue(query.expenseSaved) === "1" ? (
        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-950/25 px-4 py-3 text-sm leading-7 text-emerald-100">
          سند هزینه ثبت شد و یک رویداد حسابرسی برای آن ساخته شد.
        </div>
      ) : null}

      {singleValue(query.expenseVoided) === "1" ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-950/25 px-4 py-3 text-sm leading-7 text-amber-100">
          سند حذف نشد؛ با دلیل شما باطل شد و سابقهٔ آن برای حسابرسی حفظ شده است.
        </div>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.17)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#a99c82]">
                فروش قطعی
              </p>
              <p className="mt-3 text-xl font-semibold text-[#f5e4bb] sm:text-2xl">
                {formatAdminMoney(report.salesToman)}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-300/15 bg-emerald-950/20 text-emerald-200">
              <ShoppingBag className="h-5 w-5" />
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-6 text-[#a99c82]">
            <span>{new Intl.NumberFormat("fa-IR").format(report.orderCount)} سفارش پرداخت‌شده</span>
            <span className={salesChange !== null && salesChange < 0 ? "text-orange-200" : "text-emerald-200"}>
              {changeSummary(salesChange, report.salesToman)}
            </span>
          </div>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.17)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#a99c82]">
                نقدینگی پس از هزینه
              </p>
              <p className={`mt-3 text-xl font-semibold sm:text-2xl ${report.netCashAfterExpensesToman < 0n ? "text-red-200" : "text-[#f5e4bb]"}`}>
                {formatAdminMoney(report.netCashAfterExpensesToman)}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-sky-300/15 bg-sky-950/20 text-sky-200">
              <WalletCards className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#a99c82]">
            {formatAdminMoney(report.receivedToman)} دریافتی − {formatAdminMoney(report.refundedToman)} بازپرداخت − {formatAdminMoney(report.expenses.totalToman)} هزینه
          </p>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.17)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#a99c82]">
                هزینه‌های ثبت‌شده
              </p>
              <p className="mt-3 text-xl font-semibold text-[#f5e4bb] sm:text-2xl">
                {formatAdminMoney(report.expenses.totalToman)}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-orange-300/15 bg-orange-950/20 text-orange-200">
              <ReceiptText className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#a99c82]">
            {new Intl.NumberFormat("fa-IR").format(report.expenses.count)} سند فعال؛ شامل {formatAdminMoney(report.expenses.taxToman)} مالیات سند
          </p>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.17)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#a99c82]">
                نتیجهٔ عملیاتی
              </p>
              <p className={`mt-3 text-xl font-semibold sm:text-2xl ${report.operatingResultToman < 0n ? "text-red-200" : "text-[#f5e4bb]"}`}>
                {formatAdminMoney(report.operatingResultToman)}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-[#d1b45d]/18 bg-[#d1b45d]/8 text-[#e4c870]">
              <CircleDollarSign className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#a99c82]">
            حاشیهٔ ثبت‌شده {formatAdminMoney(report.priceMarginToman)}{marginRate === null ? "" : ` (${formatPercentage(marginRate)} از فروش)`} − هزینهٔ عملیاتی {formatAdminMoney(report.expenses.operatingToman)}
          </p>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.17)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#a99c82]">
                خرید کالا و طلا
              </p>
              <p className="mt-3 text-xl font-semibold text-[#f5e4bb] sm:text-2xl">
                {formatAdminMoney(report.expenses.inventoryPurchaseToman)}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-violet-300/15 bg-violet-950/20 text-violet-200">
              <Banknote className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#a99c82]">
            این بخش جدا نگه داشته می‌شود تا با موجودی و بهای تمام‌شده اشتباه نشود.
          </p>
        </article>

        <article className="rounded-[22px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 shadow-[0_18px_55px_rgba(0,0,0,0.17)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[#a99c82]">
                میانگین هر سفارش
              </p>
              <p className="mt-3 text-xl font-semibold text-[#f5e4bb] sm:text-2xl">
                {formatAdminMoney(report.averageOrderToman)}
              </p>
            </div>
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-violet-300/15 bg-violet-950/20 text-violet-200">
              <Banknote className="h-5 w-5" />
            </span>
          </div>
          <p className="mt-4 text-xs leading-6 text-[#a99c82]">
            فقط سفارش‌هایی که پرداختشان تأیید شده است.
          </p>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 sm:p-6">
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#d1b45d]/18 bg-[#d1b45d]/8 text-[#e4c870]">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-[#efd782]">
                  روند فروش روزانه
                </h2>
                <p className="mt-1 text-xs text-[#8f846d]">
                  فروش قطعی در {formatFinancePeriod(period)}
                </p>
              </div>
            </div>

            <span className="rounded-lg bg-[#d1b45d]/8 px-2.5 py-1 text-xs text-[#dcc573]">
              {formatAdminMoney(report.salesToman)}
            </span>
          </header>

          {maxDailyRevenue > 0n ? (
            <div className="mt-8">
              <div className="flex h-52 items-end gap-1" aria-label="نمودار فروش روزانه">
                {report.dailySales.map(
                  point => {
                    const height = Math.max(
                      4,
                      Number(
                        (point.revenueToman * 100n) /
                          maxDailyRevenue,
                      ),
                    );

                    return (
                      <div
                        key={point.key}
                        className="group relative flex h-full min-w-0 flex-1 items-end"
                        title={`${point.label}: ${formatAdminMoney(point.revenueToman)} (${new Intl.NumberFormat("fa-IR").format(point.orderCount)} سفارش)`}
                      >
                        <div
                          style={{
                            height: `${height}%`,
                          }}
                          className="w-full rounded-t-md bg-[linear-gradient(180deg,#efda87,#a77d31)] opacity-90 transition group-hover:opacity-100"
                        />
                      </div>
                    );
                  },
                )}
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-[#8f846d]">
                <span>{firstDay?.label}</span>
                <span>هر ستون یک روز است</span>
                <span>{lastDay?.label}</span>
              </div>
            </div>
          ) : (
            <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-[#d0b359]/16 px-5 text-center text-sm leading-7 text-[#91866f]">
              در این بازه هنوز فروش قطعی ثبت نشده است.
            </div>
          )}
        </article>

        <article className="rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-violet-300/15 bg-violet-950/20 text-violet-200">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#efd782]">
                هشدارهای هوشمند
              </h2>
              <p className="mt-1 text-xs text-[#8f846d]">
                نتیجهٔ قواعد حسابرسی روی داده‌های واقعی
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {insights.map(
              insight => (
                <div
                  key={insight.title}
                  className={`rounded-2xl border p-3.5 ${insightTone[insight.tone]}`}
                >
                  <p className="text-sm font-medium">
                    {insight.title}
                  </p>
                  <p className="mt-1.5 text-xs leading-6 opacity-80">
                    {insight.body}
                  </p>
                </div>
              ),
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
        <article className="rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d1b45d]/18 bg-[#d1b45d]/8 text-[#e4c870]">
              <FilePlus2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#efd782]">
                ثبت سند هزینه
              </h2>
              <p className="mt-1 text-xs leading-6 text-[#8f846d]">
                شمارهٔ فاکتور، رسید انتقال یا هر مرجع قابل پیگیری را بنویسید؛ تکرار یک مرجع برای همان فروشنده پذیرفته نمی‌شود.
              </p>
            </div>
          </div>

          <form action={saveExpense} className="mt-5 grid gap-3">
            <input type="hidden" name="period" value={period} />

            <label className="grid gap-1.5 text-sm text-[#cbbd9d]">
              دسته‌بندی هزینه
              <select
                name="category"
                required
                defaultValue=""
                className="h-11 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 text-sm text-[#f4e2b9] outline-none focus:border-[#d8ba62]/55"
              >
                <option value="" disabled>انتخاب کنید</option>
                {financeExpenseCategories.map(
                  category => (
                    <option key={category} value={category}>
                      {getFinanceExpenseCategoryLabel(category)}
                    </option>
                  ),
                )}
              </select>
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm text-[#cbbd9d]">
                تاریخ سند
                <input
                  name="occurredAt"
                  type="date"
                  required
                  defaultValue={expenseDate}
                  className="h-11 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 text-sm text-[#f4e2b9] outline-none focus:border-[#d8ba62]/55"
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[#cbbd9d]">
                مبلغ اصلی (تومان)
                <input
                  name="amountToman"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={30}
                  placeholder="مثال: ۱۲۵۰۰۰۰"
                  className="h-11 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 text-sm text-[#f4e2b9] outline-none placeholder:text-[#776d5a] focus:border-[#d8ba62]/55"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm text-[#cbbd9d]">
              مالیات یا عوارض سند (تومان، اختیاری)
              <input
                name="taxToman"
                type="text"
                inputMode="numeric"
                maxLength={30}
                placeholder="در صورت نداشتن، خالی بگذارید"
                className="h-11 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 text-sm text-[#f4e2b9] outline-none placeholder:text-[#776d5a] focus:border-[#d8ba62]/55"
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-sm text-[#cbbd9d]">
                فروشنده یا طرف حساب
                <input
                  name="supplier"
                  type="text"
                  required
                  minLength={2}
                  maxLength={160}
                  placeholder="مثال: تامین‌کننده طلا"
                  className="h-11 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 text-sm text-[#f4e2b9] outline-none placeholder:text-[#776d5a] focus:border-[#d8ba62]/55"
                />
              </label>
              <label className="grid gap-1.5 text-sm text-[#cbbd9d]">
                شمارهٔ فاکتور یا رسید
                <input
                  name="reference"
                  type="text"
                  required
                  minLength={3}
                  maxLength={160}
                  placeholder="مثال: inv-1405-101"
                  className="h-11 rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 text-sm text-[#f4e2b9] outline-none placeholder:text-[#776d5a] focus:border-[#d8ba62]/55"
                />
              </label>
            </div>

            <label className="grid gap-1.5 text-sm text-[#cbbd9d]">
              توضیح (اختیاری)
              <textarea
                name="note"
                maxLength={2000}
                rows={3}
                placeholder="دلیل، نوع پرداخت یا هر جزئیات لازم برای حسابرسی"
                className="resize-y rounded-xl border border-[#d0b359]/18 bg-[#02150f] px-3 py-2.5 text-sm text-[#f4e2b9] outline-none placeholder:text-[#776d5a] focus:border-[#d8ba62]/55"
              />
            </label>

            <button
              type="submit"
              className="mt-1 inline-flex h-11 items-center justify-center rounded-xl bg-[#d2b55f] px-4 text-sm font-semibold text-[#10251c] transition hover:bg-[#e0c973]"
            >
              ثبت قطعی سند و رویداد حسابرسی
            </button>
          </form>
        </article>

        <article className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
          <header className="flex flex-col gap-4 border-b border-[#d0b359]/12 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#d1b45d]/18 bg-[#d1b45d]/8 text-[#e4c870]">
                <ReceiptText className="h-5 w-5" />
              </span>
              <div>
                <h2 className="font-semibold text-[#efd782]">
                  دفتر هزینه و مستندات
                </h2>
                <p className="mt-1 text-xs text-[#8f846d]">
                  ۸۰ سند آخر این بازه؛ {new Intl.NumberFormat("fa-IR").format(report.expenses.auditEventCount)} رویداد حسابرسی ثبت‌شده
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={exportHref(locale, period, "ledger")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d0b359]/20 px-3 py-2 text-xs text-[#e2c96f] transition hover:bg-[#d1b45d]/8"
              >
                <Download className="h-4 w-4" />
                دفتر csv
              </Link>
              <Link
                href={exportHref(locale, period, "audit")}
                className="inline-flex items-center gap-2 rounded-xl border border-[#d0b359]/20 px-3 py-2 text-xs text-[#e2c96f] transition hover:bg-[#d1b45d]/8"
              >
                <Download className="h-4 w-4" />
                رویدادهای csv
              </Link>
            </div>
          </header>

          {report.expenses.ledger.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-right text-sm">
                <thead className="bg-black/10 text-[#9f9279]">
                  <tr>
                    <th className="px-5 py-3 font-medium">سند و تاریخ</th>
                    <th className="px-5 py-3 font-medium">دسته و طرف حساب</th>
                    <th className="px-5 py-3 font-medium">مرجع</th>
                    <th className="px-5 py-3 font-medium">جمع هزینه</th>
                    <th className="px-5 py-3 font-medium">وضعیت</th>
                    <th className="px-5 py-3 font-medium">اقدام</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0b359]/10">
                  {report.expenses.ledger.map(
                    expense => {
                      const voidExpense =
                        voidFinanceExpenseAction.bind(
                          null,
                          expense.id,
                          locale,
                        );

                      return (
                        <tr
                          key={expense.id}
                          className="align-top transition hover:bg-white/[0.025]"
                        >
                          <td className="px-5 py-4 text-[#dfcfac]">
                            <p className="font-medium text-[#ecd17c]">
                              {expense.documentNumber}
                            </p>
                            <p className="mt-1 text-xs text-[#93866f]">
                              {formatAdminDate(expense.occurredAt)}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-[#d5c6a6]">
                            <p>{getFinanceExpenseCategoryLabel(expense.category)}</p>
                            <p className="mt-1 text-xs text-[#93866f]">
                              {expense.supplier}
                            </p>
                          </td>
                          <td className="px-5 py-4 text-[#c6b89a]">
                            <p className="font-mono text-xs">{expense.reference}</p>
                            {expense.note ? (
                              <p className="mt-1 max-w-56 text-xs leading-5 text-[#8f846d]">
                                {expense.note}
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4 font-medium text-[#e4d2aa]">
                            {formatAdminMoney(
                              BigInt(expense.amountToman.toString().split(".")[0] || "0") +
                              BigInt(expense.taxToman.toString().split(".")[0] || "0"),
                            )}
                            {expense.taxToman.toString() !== "0" ? (
                              <p className="mt-1 text-xs font-normal text-[#93866f]">
                                شامل {formatAdminMoney(expense.taxToman)} مالیات
                              </p>
                            ) : null}
                          </td>
                          <td className="px-5 py-4">
                            {expense.status === "POSTED" ? (
                              <span className="rounded-full border border-emerald-300/20 bg-emerald-950/25 px-2.5 py-1 text-xs text-emerald-100">
                                ثبت‌شده
                              </span>
                            ) : (
                              <div>
                                <span className="rounded-full border border-amber-300/20 bg-amber-950/25 px-2.5 py-1 text-xs text-amber-100">
                                  باطل‌شده
                                </span>
                                <p className="mt-2 max-w-44 text-xs leading-5 text-[#b9a98a]">
                                  {expense.voidReason}
                                </p>
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-4">
                            {expense.status === "POSTED" ? (
                              <details className="w-56">
                                <summary className="cursor-pointer text-xs text-amber-200 hover:text-amber-100">
                                  ابطال با دلیل
                                </summary>
                                <form action={voidExpense} className="mt-2 grid gap-2">
                                  <input type="hidden" name="period" value={period} />
                                  <textarea
                                    name="voidReason"
                                    required
                                    minLength={5}
                                    maxLength={1000}
                                    rows={2}
                                    placeholder="دلیل ابطال (حداقل ۵ حرف)"
                                    className="resize-y rounded-lg border border-amber-300/20 bg-[#02150f] px-2.5 py-2 text-xs text-[#f4e2b9] outline-none placeholder:text-[#776d5a] focus:border-amber-300/50"
                                  />
                                  <button
                                    type="submit"
                                    className="rounded-lg border border-amber-300/25 bg-amber-950/30 px-2.5 py-2 text-xs text-amber-100 hover:bg-amber-950/45"
                                  >
                                    ثبت ابطال؛ بدون حذف سند
                                  </button>
                                </form>
                              </details>
                            ) : (
                              <span className="text-xs text-[#8f846d]">
                                قابل بازگردانی نیست
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    },
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-64 place-items-center px-5 text-center text-sm leading-7 text-[#91866f]">
              هنوز سند هزینه‌ای در این بازه ثبت نشده است. از فرم کنار این جدول، یک فاکتور یا رسید واقعی وارد کنید.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
          <header className="flex items-center justify-between border-b border-[#d0b359]/12 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-xl border ${reconciliationIsClear ? "border-emerald-300/15 bg-emerald-950/20 text-emerald-200" : "border-red-300/20 bg-red-950/20 text-red-200"}`}>
                {reconciliationIsClear ? <ShieldCheck className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </span>
              <div>
                <h2 className="font-semibold text-[#efd782]">
                  مغایرت‌گیری سفارش و پرداخت
                </h2>
                <p className="mt-1 text-xs text-[#8f846d]">
                  مبلغ قابل پرداخت هر سفارش با مجموع پرداخت ثبت‌شده در درگاه تطبیق داده می‌شود.
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/admin/orders?status=PAYMENT_ATTEMPT_REVIEW`}
              className="shrink-0 text-xs text-[#e2c96f] hover:text-[#f3dc89]"
            >
              صف پرداخت‌ها
            </Link>
          </header>

          <div className="grid gap-px bg-[#d0b359]/10 sm:grid-cols-3">
            <div className="bg-[#041d15]/82 px-5 py-4">
              <p className="text-xs text-[#8f846d]">سفارش بررسی‌شده</p>
              <p className="mt-1 font-semibold text-[#e5d3ab]">{new Intl.NumberFormat("fa-IR").format(report.reconciliation.inspectedOrderCount)}</p>
            </div>
            <div className="bg-[#041d15]/82 px-5 py-4">
              <p className="text-xs text-[#8f846d]">اختلاف مجموع</p>
              <p className={`mt-1 font-semibold ${report.reconciliation.mismatchCount ? "text-red-200" : "text-emerald-200"}`}>{formatAdminMoney(report.reconciliation.mismatchToman)}</p>
            </div>
            <div className="bg-[#041d15]/82 px-5 py-4">
              <p className="text-xs text-[#8f846d]">صف بررسی درگاه</p>
              <p className={`mt-1 font-semibold ${report.reconciliation.paymentReview.count ? "text-red-200" : "text-emerald-200"}`}>{new Intl.NumberFormat("fa-IR").format(report.reconciliation.paymentReview.count)}</p>
            </div>
          </div>

          {report.reconciliation.examples.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-right text-sm">
                <thead className="bg-black/10 text-[#9f9279]">
                  <tr>
                    <th className="px-5 py-3 font-medium">سفارش</th>
                    <th className="px-5 py-3 font-medium">انتظار</th>
                    <th className="px-5 py-3 font-medium">ثبت‌شده</th>
                    <th className="px-5 py-3 font-medium">اختلاف</th>
                    <th className="px-5 py-3 font-medium">بررسی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0b359]/10">
                  {report.reconciliation.examples.map(
                    item => (
                      <tr key={item.id}>
                        <td className="px-5 py-4 font-medium text-[#ecd17c]">{item.orderNumber}</td>
                        <td className="px-5 py-4 text-[#d5c6a6]">{formatAdminMoney(item.expectedToman)}</td>
                        <td className="px-5 py-4 text-[#d5c6a6]">{formatAdminMoney(item.receivedToman)}</td>
                        <td className={`px-5 py-4 font-medium ${item.differenceToman < 0n ? "text-red-200" : "text-amber-200"}`}>{formatSignedMoney(item.differenceToman)}</td>
                        <td className="px-5 py-4">
                          <Link href={`/${locale}/admin/orders/${item.id}`} className="text-xs text-[#e2c96f] hover:text-[#f3dc89]">باز کردن</Link>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-7 text-center text-sm leading-7 text-emerald-100">
              {reconciliationIsClear
                ? "در این بازه اختلافی میان سفارش‌های پرداخت‌شده و پرداخت ثبت‌شده دیده نشد."
                : "اختلاف سفارش وجود ندارد، اما پرداخت‌های نیازمند بررسی را از صف پرداخت‌ها پیگیری کنید."}
            </div>
          )}
        </article>

        <article className="rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#d1b45d]/18 bg-[#d1b45d]/8 text-[#e4c870]">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#efd782]">
                تفکیک هزینه‌های ثبت‌شده
              </h2>
              <p className="mt-1 text-xs text-[#8f846d]">
                فقط اسناد فعال وارد محاسبه می‌شوند؛ اسناد ابطال‌شده صرفاً در تاریخچه می‌مانند.
              </p>
            </div>
          </div>

          {report.expenses.categories.length ? (
            <div className="mt-5 divide-y divide-[#d0b359]/10 rounded-2xl border border-[#d0b359]/12 bg-[#02150f] px-4">
              {report.expenses.categories.map(
                expense => {
                  const share =
                    percentageOf(
                      expense.totalToman,
                      report.expenses.totalToman,
                    );

                  return (
                    <div key={expense.category} className="flex items-center justify-between gap-4 py-3.5 text-sm">
                      <dt className="text-[#b8aa8e]">{getFinanceExpenseCategoryLabel(expense.category)}</dt>
                      <dd className="text-left">
                        <p className="font-medium text-[#e5d3ab]">{formatAdminMoney(expense.totalToman)}</p>
                        <p className="mt-1 text-xs text-[#8f846d]">{share === null ? "—" : `${formatPercentage(share)} از هزینه‌ها`}</p>
                      </dd>
                    </div>
                  );
                },
              )}
            </div>
          ) : (
            <div className="mt-5 grid min-h-48 place-items-center rounded-2xl border border-dashed border-[#d0b359]/16 px-5 text-center text-sm leading-7 text-[#91866f]">
              با ثبت سند، سهم هر دسته از هزینه‌ها اینجا دیده می‌شود.
            </div>
          )}
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="overflow-hidden rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82">
          <header className="flex items-center justify-between border-b border-[#d0b359]/12 px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold text-[#efd782]">
                پرفروش‌ترین محصولات
              </h2>
              <p className="mt-1 text-xs text-[#8f846d]">
                بر پایهٔ فروش قطعی همین بازه
              </p>
            </div>
            <TrendingUp className="h-5 w-5 text-[#d7bb67]" />
          </header>

          {report.topProducts.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-right text-sm">
                <thead className="bg-black/10 text-[#9f9279]">
                  <tr>
                    <th className="px-5 py-3 font-medium">محصول</th>
                    <th className="px-5 py-3 font-medium">تعداد</th>
                    <th className="px-5 py-3 font-medium">فروش</th>
                    <th className="px-5 py-3 font-medium">حاشیهٔ ثبت‌شده</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#d0b359]/10">
                  {report.topProducts.map(
                    product => (
                      <tr key={product.slug} className="transition hover:bg-white/[0.025]">
                        <td className="px-5 py-4 text-[#dfcfac]">{product.name}</td>
                        <td className="px-5 py-4 text-[#b8aa8d]">{new Intl.NumberFormat("fa-IR").format(product.quantity)}</td>
                        <td className="px-5 py-4 text-[#e4d2aa]">{formatAdminMoney(product.revenueToman)}</td>
                        <td className="px-5 py-4 text-[#cddfba]">{formatAdminMoney(product.priceMarginToman)}</td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="grid min-h-48 place-items-center px-5 text-center text-sm text-[#91866f]">
              با ثبت فروش قطعی، محصولات اینجا رتبه‌بندی می‌شوند.
            </div>
          )}
        </article>

        <article className="rounded-[24px] border border-[#d0b359]/15 bg-[#041d15]/82 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-[#d1b45d]/18 bg-[#d1b45d]/8 text-[#e4c870]">
              <ReceiptText className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-semibold text-[#efd782]">
                تفکیک مالی فروش
              </h2>
              <p className="mt-1 text-xs text-[#8f846d]">
                اجزای ذخیره‌شده در سفارش‌های پرداخت‌شده
              </p>
            </div>
          </div>

          <dl className="mt-5 divide-y divide-[#d0b359]/10 rounded-2xl border border-[#d0b359]/12 bg-[#02150f] px-4">
            <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
              <dt className="text-[#b8aa8e]">فروش اقلام</dt>
              <dd className="font-medium text-[#e5d3ab]">{formatAdminMoney(report.itemRevenueToman)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
              <dt className="text-[#b8aa8e]">هزینهٔ ارسال ثبت‌شده</dt>
              <dd className="font-medium text-[#e5d3ab]">{formatAdminMoney(report.shippingToman)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
              <dt className="text-[#b8aa8e]">تخفیف ثبت‌شده</dt>
              <dd className="font-medium text-orange-200">−{formatAdminMoney(report.discountToman)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
              <dt className="text-[#b8aa8e]">اجرت و هزینهٔ هنری</dt>
              <dd className="font-medium text-[#e5d3ab]">{formatAdminMoney(report.makingChargeToman + report.artisticFeeToman)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
              <dt className="text-[#b8aa8e]">مالیات درج‌شده در سفارش</dt>
              <dd className="font-medium text-[#e5d3ab]">{formatAdminMoney(report.taxToman)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4 py-3.5 text-sm">
              <dt className="flex items-center gap-2 text-[#b8aa8e]"><RotateCcw className="h-4 w-4" /> بازپرداخت ثبت‌شده</dt>
              <dd className="font-medium text-red-200">{formatAdminMoney(report.refundedToman)}</dd>
            </div>
          </dl>
        </article>
      </section>

      <article className="flex flex-col gap-4 rounded-[24px] border border-[#d0b359]/15 bg-[#061f17]/85 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex max-w-4xl gap-3">
          <span className="mt-0.5 text-[#d3b55f]">
            <TrendingDown className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-[#f0d880]">
              محدودهٔ دقیق این ابزار
            </h2>
            <p className="mt-2 text-sm leading-7 text-[#ad9f82]">
              این پنل یک دفتر عملیاتی قابل حسابرسی است: فروش، پرداخت، بازپرداخت، هزینه و دلیل ابطال را از داده‌های واقعی ثبت و تطبیق می‌دهد. «سود خالص قانونی» عمداً نمایش داده نمی‌شود؛ برای آن باید موجودی‌گردانی، بهای تمام‌شدهٔ هر قطعه، مالیات و اسناد خارج از سایت نیز توسط حسابدار رسمی بررسی شوند.
            </p>
          </div>
        </div>
        <Link
          href={`/${locale}/admin/orders`}
          className="inline-flex shrink-0 items-center justify-center rounded-xl border border-[#d0b359]/20 px-4 py-2.5 text-sm text-[#e2c96f] transition hover:bg-[#d1b45d]/8"
        >
          بررسی سفارش‌ها
        </Link>
      </article>
    </div>
  );
}
