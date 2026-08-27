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

function decimalLikeToBigInt(value: { toString(): string } | null | undefined): bigint {
  if (!value) return 0n;
  const raw = value.toString();
  const integer = raw.includes(".") ? raw.slice(0, raw.indexOf(".")) : raw;
  try {
    return BigInt(integer || "0");
  } catch {
    return 0n;
  }
}

function productQualityScore(product: {
  descriptionFa: string | null;
  descriptionEn: string | null;
  legendFa: string | null;
  metalWeight: { toString(): string } | null;
  purity: string | null;
  purityFineness: number | null;
  images: Array<{ altFa: string | null; altEn: string | null }>;
}): number {
  let score = 20; // Published product identity/name already exists in this query.
  if (product.descriptionFa?.trim()) score += 15;
  if (product.descriptionEn?.trim()) score += 10;
  if (product.legendFa?.trim()) score += 10;
  if (product.metalWeight) score += 15;
  if (product.purity?.trim() || product.purityFineness) score += 10;
  const primary = product.images[0];
  if (primary) score += 10;
  if (primary?.altFa?.trim()) score += 5;
  if (primary?.altEn?.trim()) score += 5;
  return Math.min(100, score);
}

function buildCustomerRfm(rows: Array<{
  customerId: string | null;
  _count: { _all: number };
  _sum: { payableToman: { toString(): string } | null };
  _max: { paidAt: Date | null; createdAt: Date | null };
}>, now: Date) {
  const candidates = rows
    .filter((row) => Boolean(row.customerId))
    .map((row) => ({
      customerId: row.customerId as string,
      frequency: row._count._all,
      monetary: decimalLikeToBigInt(row._sum.payableToman),
      lastPurchaseAt: row._max.paidAt ?? row._max.createdAt,
    }))
    .filter((row) => row.lastPurchaseAt !== null);

  const monetaryRanking = [...candidates].sort((left, right) =>
    left.monetary === right.monetary ? 0 : left.monetary > right.monetary ? -1 : 1,
  );
  const monetaryRank = new Map(monetaryRanking.map((row, index) => [row.customerId, index]));
  const total = candidates.length;
  const segments = { vip: 0, loyal: 0, newCustomers: 0, atRisk: 0, active: 0, total };

  for (const row of candidates) {
    const ageDays = Math.max(0, Math.floor((now.getTime() - (row.lastPurchaseAt as Date).getTime()) / 86_400_000));
    const recencyScore = ageDays <= 30 ? 3 : ageDays <= 90 ? 2 : 1;
    const frequencyScore = row.frequency >= 4 ? 3 : row.frequency >= 2 ? 2 : 1;
    const rank = monetaryRank.get(row.customerId) ?? total;
    const monetaryScore = total <= 1 ? 2 : rank < total / 3 ? 3 : rank < (2 * total) / 3 ? 2 : 1;
    const score = recencyScore + frequencyScore + monetaryScore;

    if (score >= 8) segments.vip += 1;
    else if (recencyScore === 1 && frequencyScore >= 2) segments.atRisk += 1;
    else if (recencyScore === 3 && row.frequency === 1) segments.newCustomers += 1;
    else if (score >= 6) segments.loyal += 1;
    else segments.active += 1;
  }

  return segments;
}

export async function getSiteIntelligence() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60_000);
  const environment = productionEnvironmentChecks().filter((check) => check.required);

  const [content, finance, prices, unavailableProducts, paymentReview, watchCount, eventGroups, vitalRows, latestBriefing, productViews, productSales, customerOrderGroups, qualityProducts, marketingSources] = await Promise.all([
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
    prisma.siteMeasurementEvent.groupBy({
      by: ["productSlug"],
      where: {
        eventType: "view_item",
        occurredAt: { gte: thirtyDaysAgo },
        productSlug: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.orderItem.groupBy({
      by: ["productSlug"],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        order: { status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] } },
      },
      _sum: { quantity: true },
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where: {
        customerId: { not: null },
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] },
      },
      _count: { _all: true },
      _sum: { payableToman: true },
      _max: { paidAt: true, createdAt: true },
    }),
    prisma.product.findMany({
      where: { status: { in: ["ACTIVE", "OUT_OF_STOCK"] } },
      select: {
        slug: true,
        nameFa: true,
        descriptionFa: true,
        descriptionEn: true,
        legendFa: true,
        metalWeight: true,
        purity: true,
        purityFineness: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
          take: 3,
          select: { altFa: true, altEn: true },
        },
      },
      take: 500,
    }),
    prisma.order.groupBy({
      by: ["marketingSource"],
      where: {
        createdAt: { gte: thirtyDaysAgo },
        marketingSource: { not: null },
        status: { in: ["PAID", "PROCESSING", "SHIPPED", "COMPLETED"] },
      },
      _count: { _all: true },
      _sum: { payableToman: true },
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

  const salesBySlug = new Map(productSales.map((row) => [row.productSlug, row._sum.quantity ?? 0]));
  const topViewedProducts = productViews
    .filter((row) => Boolean(row.productSlug))
    .map((row) => ({ slug: row.productSlug as string, views: row._count._all }))
    .sort((left, right) => right.views - left.views)
    .slice(0, 5);
  const topSellingProducts = productSales
    .map((row) => ({ slug: row.productSlug, sales: row._sum.quantity ?? 0 }))
    .sort((left, right) => right.sales - left.sales)
    .slice(0, 5);

  const marketingOpportunities = productViews
    .filter((row) => Boolean(row.productSlug))
    .map((row) => ({
      slug: row.productSlug as string,
      views: row._count._all,
      sales: salesBySlug.get(row.productSlug as string) ?? 0,
    }))
    .filter((row) => row.views >= 8 && row.sales === 0)
    .sort((left, right) => right.views - left.views)
    .slice(0, 3);

  for (const opportunity of marketingOpportunities) {
    actions.push({
      id: `conversion-${opportunity.slug}`,
      priority: opportunity.views >= 25 ? "medium" : "low",
      title: "بازدید بالا، فروش ثبت‌شده ندارد",
      detail: `محصول ${opportunity.slug} در ۳۰ روز اخیر ${opportunity.views} بازدید محصول داشته اما فروش نهایی ثبت نشده است؛ تصویر اصلی، توضیح، قیمت و CTA را بازبینی کنید.`,
      href: `/fa/products/${opportunity.slug}`,
      hrefLabel: "مشاهده محصول",
    });
  }

  const customerSegments = buildCustomerRfm(customerOrderGroups, now);
  const productQualityRows = qualityProducts
    .map((product) => ({
      slug: product.slug,
      nameFa: product.nameFa,
      score: productQualityScore(product),
    }))
    .sort((left, right) => left.score - right.score);
  const averageProductQuality = productQualityRows.length
    ? Math.round(productQualityRows.reduce((total, product) => total + product.score, 0) / productQualityRows.length)
    : 0;
  const lowQualityProducts = productQualityRows.filter((product) => product.score < 75).slice(0, 5);

  if (lowQualityProducts.length) {
    actions.push({
      id: "product-quality",
      priority: lowQualityProducts.some((product) => product.score < 55) ? "medium" : "low",
      title: "برخی صفحه‌های محصول برای فروش و سئو کامل نیستند",
      detail: `${lowQualityProducts.length} محصول در صف اول بهبود قرار گرفته‌اند؛ توضیح، داستان اثر، وزن/عیار و alt تصاویر را کامل کنید.`,
      href: "/fa/admin/products",
      hrefLabel: "بهبود محصولات",
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

  const topMarketingSources = marketingSources
    .filter((row) => Boolean(row.marketingSource))
    .map((row) => ({
      source: row.marketingSource as string,
      orders: row._count._all,
      salesToman: decimalLikeToBigInt(row._sum.payableToman).toString(),
    }))
    .sort((left, right) => right.orders - left.orders)
    .slice(0, 6);

  const eventCounts = Object.fromEntries(eventGroups.map((group) => [group.eventType, group._count._all]));
  const viewItemCount = eventCounts.view_item ?? 0;
  const addToCartCount = eventCounts.add_to_cart ?? 0;
  const beginCheckoutCount = eventCounts.begin_checkout ?? 0;
  const conversionRate = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 10_000) / 100 : null;

  const checkoutToPaidPercent = conversionRate(finance.orderCount, beginCheckoutCount);
  if (beginCheckoutCount >= 5 && checkoutToPaidPercent !== null && checkoutToPaidPercent < 35) {
    actions.push({
      id: "checkout-dropoff",
      priority: checkoutToPaidPercent < 20 ? "high" : "medium",
      title: "ریزش پرداخت بالاتر از حد انتظار است",
      detail: `در ۳۰ روز اخیر ${beginCheckoutCount} شروع پرداخت و ${finance.orderCount} خرید نهایی ثبت شده است. فرم، خطای درگاه، مبلغ نهایی و تجربه موبایل را بازبینی کنید.`,
      href: "/fa/admin/orders",
      hrefLabel: "بررسی سفارش‌ها",
    });
  }

  const couponAppliedCount = eventCounts.coupon_applied ?? 0;
  const couponRejectedCount = eventCounts.coupon_rejected ?? 0;
  if (couponRejectedCount >= 5 && couponRejectedCount > Math.max(5, couponAppliedCount * 2)) {
    actions.push({
      id: "coupon-friction",
      priority: "medium",
      title: "اصطکاک کد خرید اول بالاست",
      detail: `${couponRejectedCount} بررسی ناموفق در برابر ${couponAppliedCount} اعمال موفق ثبت شده است؛ متن راهنما، ورود شماره موبایل و شرایط خرید اول را بررسی کنید.`,
      href: "/fa/checkout",
      hrefLabel: "بررسی Checkout",
    });
  }

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
    marketing: {
      opportunities: marketingOpportunities,
      topViewedProducts,
      topSellingProducts,
      paidOrderCount: finance.orderCount,
      topMarketingSources,
      funnel: {
        viewToCartPercent: conversionRate(addToCartCount, viewItemCount),
        cartToCheckoutPercent: conversionRate(beginCheckoutCount, addToCartCount),
        checkoutToPaidPercent,
      },
      customerSegments,
      productQuality: {
        averageScore: averageProductQuality,
        needsAttention: lowQualityProducts,
      },
    },
    measurement: {
      enabled: isSiteMeasurementEnabled(),
      eventCounts,
      vitals: metricSummary(vitalRows),
    },
    actions: actions.sort((left, right) => ({ high: 0, medium: 1, low: 2 }[left.priority] - { high: 0, medium: 1, low: 2 }[right.priority])),
  };
}
