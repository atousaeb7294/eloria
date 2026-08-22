import { Prisma } from "@/generated/prisma/client";

import { articleSeoScore } from "@/lib/content-studio";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export type ContentSeoIssue = {
  id: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  title: string;
  detail: string;
  action: string;
};

export type ContentSeoHealth = {
  overallScore: number;
  publishedArticleCount: number;
  draftArticleCount: number;
  activeProductCount: number;
  productsMissingDescription: number;
  productsMissingImageAlt: number;
  stalePublishedArticleCount: number;
  averagePublishedArticleScore: number;
  issues: ContentSeoIssue[];
};

type ContentSeoMetrics = Omit<ContentSeoHealth, "overallScore" | "issues">;

function nonEmpty(value: string | null | undefined): boolean {
  return Boolean(value?.trim());
}

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function buildContentSeoHealth(
  metrics: ContentSeoMetrics,
): ContentSeoHealth {
  const issues: ContentSeoIssue[] = [];
  let score = 100;

  if (metrics.activeProductCount === 0) {
    issues.push({
      id: "NO_ACTIVE_PRODUCTS",
      severity: "LOW",
      title: "هنوز محصول فعالی برای سنجش ندارید",
      detail:
        "امتیاز کاتالوگ تا زمان فعال‌شدن محصول واقعی اندازه‌گیری نمی‌شود.",
      action: "پس از ورود محصول، مشخصات و تصویرهای آن را کامل کنید.",
    });
  } else {
    const descriptionRatio =
      metrics.productsMissingDescription / metrics.activeProductCount;
    const imageRatio =
      metrics.productsMissingImageAlt / metrics.activeProductCount;

    score -= descriptionRatio * 32;
    score -= imageRatio * 24;

    if (metrics.productsMissingDescription > 0) {
      issues.push({
        id: "PRODUCT_DESCRIPTIONS_INCOMPLETE",
        severity: descriptionRatio >= 0.3 ? "HIGH" : "MEDIUM",
        title: "توضیح دو‌زبانهٔ بعضی محصولات کامل نیست",
        detail: `${metrics.productsMissingDescription} محصول فعال در دست‌کم یک زبان توضیح مفید ندارد.`,
        action: "در پنل محصولات، توضیح فارسی و انگلیسی هر محصول را کامل کنید.",
      });
    }

    if (metrics.productsMissingImageAlt > 0) {
      issues.push({
        id: "PRODUCT_IMAGE_ALT_INCOMPLETE",
        severity: imageRatio >= 0.3 ? "HIGH" : "MEDIUM",
        title: "متن جایگزین تصویر برخی محصولات ناقص است",
        detail: `${metrics.productsMissingImageAlt} محصول فعال، تصویر بدون alt فارسی یا انگلیسی دارد یا تصویر ندارد.`,
        action: "برای تصویر اصلی هر محصول، alt فارسی و انگلیسی دقیق وارد کنید.",
      });
    }
  }

  if (metrics.publishedArticleCount === 0) {
    score -= 18;
    issues.push({
      id: "NO_PUBLISHED_ARTICLES",
      severity: "MEDIUM",
      title: "مجله هنوز مقالهٔ منتشرشده ندارد",
      detail:
        "مسیر عمومی مقاله و دادهٔ ساختاریافته آماده است، اما هنوز مطلب تأییدشده‌ای برای موتور جست‌وجو وجود ندارد.",
      action:
        "از یک محصول واقعی پیش‌نویس بسازید، متن را بازبینی کنید و سپس منتشرش کنید.",
    });
  } else {
    const articleQualityPenalty =
      Math.max(0, 75 - metrics.averagePublishedArticleScore) * 0.22;

    score -= articleQualityPenalty;

    if (metrics.averagePublishedArticleScore < 75) {
      issues.push({
        id: "PUBLISHED_ARTICLE_SEO_INCOMPLETE",
        severity: "MEDIUM",
        title: "برخی مقاله‌های منتشرشده دادهٔ سئوی کامل ندارند",
        detail: `میانگین سلامت محتوای مقاله‌های منتشرشده ${metrics.averagePublishedArticleScore} از ۱۰۰ است.`,
        action:
          "عنوان سئو، توضیح سئو، کلمهٔ کلیدی، تصویر و متن هر دو زبان را تکمیل کنید.",
      });
    }
  }

  if (metrics.stalePublishedArticleCount > 0) {
    score -= Math.min(12, metrics.stalePublishedArticleCount * 3);
    issues.push({
      id: "STALE_PUBLISHED_ARTICLES",
      severity: "LOW",
      title: "مقاله‌های قدیمی نیاز به بازبینی دارند",
      detail: `${metrics.stalePublishedArticleCount} مقالهٔ منتشرشده بیش از ۱۲۰ روز بدون بازبینی مانده است.`,
      action:
        "اطلاعات محصول، پیوندها، تصویر و توضیح سئوی مقاله‌های قدیمی را بازبینی کنید.",
    });
  }

  if (metrics.draftArticleCount > 8) {
    issues.push({
      id: "DRAFT_BACKLOG",
      severity: "LOW",
      title: "پیش‌نویس‌های زیادی در صف هستند",
      detail: `${metrics.draftArticleCount} پیش‌نویس هنوز تصمیم تحریریه نگرفته است.`,
      action:
        "پیش‌نویس‌ها را تأیید، اصلاح یا بایگانی کنید تا صف محتوا قابل مدیریت بماند.",
    });
  }

  return {
    ...metrics,
    overallScore: clampScore(score),
    issues,
  };
}

function tehranDay(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return new Date(
    Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)),
  );
}

export async function getContentSeoHealth(): Promise<ContentSeoHealth> {
  const staleBefore = new Date(Date.now() - 120 * 24 * 60 * 60 * 1_000);

  const [activeProducts, articleCounts, publishedArticles] =
    await withDatabaseRetry(() =>
      Promise.all([
        prisma.product.findMany({
          where: {
            status: {
              in: ["ACTIVE", "OUT_OF_STOCK"],
            },
          },
          select: {
            descriptionFa: true,
            descriptionEn: true,
            images: {
              orderBy: [
                {
                  isPrimary: "desc",
                },
                {
                  displayOrder: "asc",
                },
              ],
              select: {
                altFa: true,
                altEn: true,
              },
            },
          },
        }),
        prisma.contentArticle.groupBy({
          by: ["status"],
          _count: {
            _all: true,
          },
        }),
        prisma.contentArticle.findMany({
          where: {
            status: "PUBLISHED",
          },
          select: {
            titleFa: true,
            titleEn: true,
            excerptFa: true,
            excerptEn: true,
            contentFa: true,
            contentEn: true,
            seoTitleFa: true,
            seoTitleEn: true,
            seoDescriptionFa: true,
            seoDescriptionEn: true,
            focusKeywordFa: true,
            focusKeywordEn: true,
            coverImageUrl: true,
            sourceProductId: true,
            sourceCollectionId: true,
            publishedAt: true,
          },
        }),
      ]),
    );

  const countByStatus = new Map(
    articleCounts.map((item) => [item.status, item._count._all]),
  );
  const productsMissingDescription = activeProducts.filter(
    (product) =>
      !nonEmpty(product.descriptionFa) || !nonEmpty(product.descriptionEn),
  ).length;
  const productsMissingImageAlt = activeProducts.filter((product) => {
    const primary = product.images[0];

    return !primary || !nonEmpty(primary.altFa) || !nonEmpty(primary.altEn);
  }).length;
  const scores = publishedArticles.map((article) => articleSeoScore(article));
  const averagePublishedArticleScore =
    scores.length === 0
      ? 0
      : Math.round(
          scores.reduce((total, score) => total + score, 0) / scores.length,
        );
  const stalePublishedArticleCount = publishedArticles.filter(
    (article) =>
      article.publishedAt !== null && article.publishedAt < staleBefore,
  ).length;

  return buildContentSeoHealth({
    publishedArticleCount: countByStatus.get("PUBLISHED") ?? 0,
    draftArticleCount:
      (countByStatus.get("DRAFT") ?? 0) + (countByStatus.get("IN_REVIEW") ?? 0),
    activeProductCount: activeProducts.length,
    productsMissingDescription,
    productsMissingImageAlt,
    stalePublishedArticleCount,
    averagePublishedArticleScore,
  });
}

export async function recordContentSeoSnapshot(): Promise<{
  created: boolean;
  health: ContentSeoHealth;
}> {
  const health = await getContentSeoHealth();
  const recordedFor = tehranDay();

  const existing = await withDatabaseRetry(() =>
    prisma.contentSeoSnapshot.findUnique({
      where: {
        recordedFor,
      },
      select: {
        id: true,
      },
    }),
  );

  if (existing) {
    return {
      created: false,
      health,
    };
  }

  try {
    await withDatabaseRetry(() =>
      prisma.contentSeoSnapshot.create({
        data: {
          recordedFor,
          overallScore: health.overallScore,
          publishedArticleCount: health.publishedArticleCount,
          draftArticleCount: health.draftArticleCount,
          activeProductCount: health.activeProductCount,
          productsMissingDescription: health.productsMissingDescription,
          productsMissingImageAlt: health.productsMissingImageAlt,
          stalePublishedArticleCount: health.stalePublishedArticleCount,
          issues: JSON.parse(
            JSON.stringify(health.issues),
          ) as Prisma.InputJsonValue,
        },
      }),
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        created: false,
        health,
      };
    }

    throw error;
  }

  return {
    created: true,
    health,
  };
}
