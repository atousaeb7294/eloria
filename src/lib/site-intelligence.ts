import { productionEnvironmentChecks } from "@/lib/env-validation";
import { getAdminFinanceReport } from "@/lib/admin-finance";
import { getContentSeoHealth } from "@/lib/content-seo-health";
import { isCustomerProductWatchesEnabled } from "@/lib/customer-product-watches";
import { prisma, withDatabaseRetry } from "@/lib/prisma";
import { isSiteMeasurementEnabled } from "@/lib/site-measurement";

export type IntelligencePriority = "high" | "medium" | "low";

export type IntelligenceAction = {
  id: string;
  priority: IntelligencePriority;
  title: string;
  detail: string;
  href: string;
  hrefLabel: string;
};

export type WebVitalSummary = {
  name: string;
  samples: number;
  p75: number | null;
};

function minutesSince(value: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - value.getTime()) / 60_000));
}

function percentile75(values: number[]): number | null {
  if (!values.length) return null;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.ceil(ordered.length * 0.75) - 1)] ?? null;
}

function metricSummary(rows: Array<{ metricName: string | null; metricValue: { toString(): string } | null }>): WebVitalSummary[] {
  return ["LCP", "INP", "CLS", "FCP", "TTFB"].map((name) => {
    const values = rows
      .filter((row) => row.metricName === name && row.metricValue !== null)
      .map((row) => Number(row.metricValue?.toString()))
      .filter((value) => Number.isFinite(value));
    return { name, samples: values.length, p75: percentile75(values) };
  });
}

export async function getSiteIntelligence() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const environment = productionEnvironmentChecks().filter((check) => check.required);

  const [content, finance, prices, unavailableProducts, paymentReview, watchCount, eventGroups, vitalRows, latestBriefing] = await Promise.all([
    getContentSeoHealth(),
    getAdminFinanceReport(30),
    withDatabaseRetry(() =>
      prisma.metalPrice.findMany({
        select: { material: true, lastSuccessAt: true, lastError: true, source: true },
        orderBy: { material: "asc" },
      }),
    ),
    prisma.product.count({
      where: {
        OR: [
          { status: "OUT_OF_STOCK" },
          { status: "ACTIVE", stock: { lte: 0 }, variants: { none: { stock: { gt: 0 }, isActive: true } } },
        ],
      },
    }),
    prisma.paymentAttempt.count({ where: { status: "REQUIRES_REVIEW" } }),
    prisma.customerProductWatch.count(),
    prisma.siteMeasurementEvent.groupBy({
      by: ["eventType"],
      where: { occurredAt: { gte: thirtyDaysAgo } },
      _count: { _all: true },
    }),
    prisma.siteMeasurementEvent.findMany({
      where: { eventType: "web_vital", occurredAt: { gte: thirtyDaysAgo } },
      select: { metricName: true, metricValue: true },
      orderBy: { occurredAt: "desc" },
      take: 5_000,
    }),
    prisma.dailyStoreBriefing.findFirst({
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    }),
  ]);

  const actions: IntelligenceAction[] = [];
  const failedEnvironment = environment.filter((check) => !check.valid);
  if (failedEnvironment.length) {
    actions.push({
      id: "production-environment",
      priority: "high",
      title: "قرارداد Production کامل نیست",
      detail: `${failedEnvironment.length} مورد از ${environment.length} کنترل لازم هنوز معتبر نیست. مقدارهای محرمانه هرگز در این پنل نمایش داده نمی‌شوند.`,
      href: "/fa/admin/security",
      hrefLabel: "بازبینی امنیت",
    });
  }

  const stalePrices = prices.filter((price) => minutesSince(price.lastSuccessAt, now) > 20 || Boolean(price.lastError));
  if (stalePrices.length) {
    actions.push({
      id: "metal-price-freshness",
      priority: "high",
      title: "نرخ فلز نیاز به بررسی دارد",
      detail: `${stalePrices.length} نرخ ثبت‌شده قدیمی است یا خطای منبع دارد. پیش از فعال‌کردن فروش، وضعیت نرخ و cron را بررسی کنید.`,
      href: "/fa/admin",
      hrefLabel: "نمای نرخ‌ها",
    });
  }

  if (paymentReview > 0) {
    actions.push({
      id: "payment-review",
      priority: "high",
      title: "پرداخت‌های نیازمند بررسی دارید",
      detail: `${paymentReview} پرداخت باید با رسید یا پنل درگاه تطبیق داده شود؛ این وضعیت به‌صورت خودکار «موفق» فرض نمی‌شود.`,
      href: "/fa/admin/orders",
      hrefLabel: "بررسی سفارش‌ها",
    });
  }

  if (unavailableProducts > 0) {
    actions.push({
      id: "inventory-queue",
      priority: "medium",
      title: "موجودی برخی محصولات نیاز به اقدام دارد",
      detail: `${unavailableProducts} محصول فعال یا قابل‌نمایش، موجودی قابل سفارش ندارد.`,
      href: "/fa/admin/products",
      hrefLabel: "مدیریت موجودی",
    });
  }

  for (const issue of content.issues.slice(0, 3)) {
    actions.push({
      id: `content-${issue.id.toLowerCase()}`,
      priority: issue.severity === "HIGH" ? "high" : issue.severity === "MEDIUM" ? "medium" : "low",
      title: issue.title,
      detail: issue.detail,
      href: "/fa/admin/content",
      hrefLabel: "محتوا و سئو",
    });
  }

  if (!isSiteMeasurementEnabled()) {
    actions.push({
      id: "measurement-consent",
      priority: "low",
      title: "سنجش عملکرد رضایتی خاموش است",
      detail: "این انتخاب حریم خصوصی را حفظ می‌کند. پس از تکمیل متن حریم خصوصی، می‌توانید آن را روشن کنید تا فقط با رضایت کاربر، سرعت و مسیرهای خرید بدون دادهٔ هویتی ثبت شوند.",
      href: "/fa/admin/security",
      hrefLabel: "راهنمای انتشار",
    });
  }

  if (isCustomerProductWatchesEnabled()) {
    actions.push({
      id: "customer-watch-cron",
      priority: "low",
      title: "پیگیری قیمت و موجودی به cron نیاز دارد",
      detail: `${watchCount} پیگیری محصول ثبت شده است. در هاست Production اجرای روزانهٔ endpoint مربوط را زمان‌بندی کنید تا اعلان داخل پنل مشتری واقعاً ساخته شود.`,
      href: "/fa/admin/security",
      hrefLabel: "چک‌لیست انتشار",
    });
  }

  if (
    !latestBriefing ||
    minutesSince(latestBriefing.updatedAt, now) > 30 * 60
  ) {
    actions.push({
      id: "automation-schedule",
      priority: "medium",
      title: "گزارش خودکار روزانه به زمان‌بند نیاز دارد",
      detail: "تا وقتی چرخهٔ زمان‌بندی‌شده اجرا نشود، نرخ، محتوا و پیگیری‌های مشتری خودکار پایش نمی‌شوند. اجرای یک‌بارهٔ نصب زمان‌بند این مورد را فعال می‌کند.",
      href: "/fa/admin/automation",
      hrefLabel: "خلبان خودکار",
    });
  }

  const eventCounts = Object.fromEntries(eventGroups.map((group) => [group.eventType, group._count._all]));
  return {
    generatedAt: now,
    environment: {
      total: environment.length,
      passed: environment.length - failedEnvironment.length,
      failed: failedEnvironment.map((check) => ({ key: check.key, message: check.message })),
    },
    finance: {
      salesToman: finance.salesToman,
      orderCount: finance.orderCount,
      netCashAfterExpensesToman: finance.netCashAfterExpensesToman,
      paymentReviewCount: finance.reconciliation.paymentReview.count,
    },
    content: {
      score: content.overallScore,
      publishedArticleCount: content.publishedArticleCount,
      productsMissingDescription: content.productsMissingDescription,
      productsMissingImageAlt: content.productsMissingImageAlt,
    },
    operations: {
      unavailableProducts,
      watches: watchCount,
      prices: prices.map((price) => ({
        material: price.material,
        minutesSinceSuccess: minutesSince(price.lastSuccessAt, now),
        source: price.source,
        hasError: Boolean(price.lastError),
      })),
    },
    measurement: {
      enabled: isSiteMeasurementEnabled(),
      eventCounts,
      vitals: metricSummary(vitalRows),
    },
    actions: actions.sort((left, right) => ({ high: 0, medium: 1, low: 2 }[left.priority] - { high: 0, medium: 1, low: 2 }[right.priority])),
  };
}
