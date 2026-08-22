import { Prisma } from "@/generated/prisma/client";
import { getContentAutopilotSettings } from "@/lib/content-autopilot";
import { getSiteIntelligence, type IntelligenceAction } from "@/lib/site-intelligence";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export type StoreBriefingSummary = {
  generatedAt: string;
  dateKey: string;
  finance: {
    salesToman: string;
    orderCount: number;
    paymentReviewCount: number;
  };
  content: {
    score: number;
    publishedArticleCount: number;
  };
  operations: {
    unavailableProducts: number;
    watchedProducts: number;
  };
  actions: IntelligenceAction[];
};

function numberValue(value: { toString(): string } | number): string {
  return typeof value === "number" ? String(value) : value.toString();
}

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export function tehranDateKey(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

export function dailyBriefingNeedsAttention(
  generatedAt: Date | null,
  now = new Date(),
): boolean {
  if (!generatedAt) return true;
  return now.getTime() - generatedAt.getTime() > 30 * 60 * 60 * 1_000;
}

function briefingDate(dateKey: string): Date {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function summaryFromReport(
  report: Awaited<ReturnType<typeof getSiteIntelligence>>,
  now: Date,
): StoreBriefingSummary {
  return {
    generatedAt: now.toISOString(),
    dateKey: tehranDateKey(now),
    finance: {
      salesToman: numberValue(report.finance.salesToman),
      orderCount: report.finance.orderCount,
      paymentReviewCount: report.finance.paymentReviewCount,
    },
    content: {
      score: report.content.score,
      publishedArticleCount: report.content.publishedArticleCount,
    },
    operations: {
      unavailableProducts: report.operations.unavailableProducts,
      watchedProducts: report.operations.watches,
    },
    actions: report.actions,
  };
}

export async function recordDailyStoreBriefing() {
  const now = new Date();
  const report = await getSiteIntelligence();
  const summary = summaryFromReport(report, now);
  const recordedFor = briefingDate(summary.dateKey);
  const highPriorityCount = summary.actions.filter(
    (action) => action.priority === "high",
  ).length;

  const briefing = await withDatabaseRetry(() =>
    prisma.dailyStoreBriefing.upsert({
      where: { recordedFor },
      create: {
        recordedFor,
        actionCount: summary.actions.length,
        highPriorityCount,
        summary: json(summary),
      },
      update: {
        actionCount: summary.actions.length,
        highPriorityCount,
        summary: json(summary),
      },
      select: {
        id: true,
        recordedFor: true,
        createdAt: true,
        updatedAt: true,
        actionCount: true,
        highPriorityCount: true,
        summary: true,
      },
    }),
  );

  return { briefing, summary };
}

export async function getStoreAutopilotOverview() {
  const [latest, report, productDraftCount] = await Promise.all([
    prisma.dailyStoreBriefing.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        actionCount: true,
        highPriorityCount: true,
        summary: true,
        updatedAt: true,
      },
    }),
    getSiteIntelligence(),
    prisma.contentArticle.count({
      where: {
        origin: "PRODUCT_ASSISTED",
        status: { in: ["DRAFT", "IN_REVIEW"] },
      },
    }),
  ]);

  const settings = getContentAutopilotSettings();
  const latestSummary = latest?.summary as unknown as StoreBriefingSummary | undefined;

  return {
    report,
    contentAutopilot: {
      ...settings,
      pendingDrafts: productDraftCount,
    },
    latest: latest
      ? {
          ...latest,
          summary: latestSummary,
          needsAttention: dailyBriefingNeedsAttention(latest.updatedAt),
        }
      : null,
  };
}
