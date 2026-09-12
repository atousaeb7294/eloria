import { scanSeoPages } from "@/lib/seo-page-scan";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { repairSeoBatch, seoAutomationEnabled, type SeoCursor } from "@/lib/seo-autopilot";
import { measureSeoPerformance } from "@/lib/seo-performance";
import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { acquireCronLease, releaseCronLease } from "@/lib/cron-lease";
import { recordContentSeoSnapshot } from "@/lib/content-seo-health";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

function bearer(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

function secretMatches(provided: string, configured: string): boolean {
  const left = Buffer.from(provided, "utf8");
  const right = Buffer.from(configured, "utf8");

  return left.length === right.length && timingSafeEqual(left, right);
}

export async function GET(request: NextRequest) {
  const configured = process.env.CRON_SECRET?.trim() ?? "";
  const provided = bearer(request);

  if (configured.length < 48) {
    return NextResponse.json(
      {
        successful: false,
        code: "CRON_SECRET_NOT_CONFIGURED",
      },
      {
        status: 503,
        headers: noStoreHeaders(),
      },
    );
  }

  if (!provided || !secretMatches(provided, configured)) {
    return NextResponse.json(
      {
        successful: false,
        code: "UNAUTHORIZED",
      },
      {
        status: 401,
        headers: {
          ...noStoreHeaders(),
          "WWW-Authenticate": "Bearer",
        },
      },
    );
  }

  const lease = await acquireCronLease({
    key: "content-health",
    leaseMs: 600_000,
  });

  if (!lease.acquired) {
    return NextResponse.json(
      {
        successful: true,
        skipped: true,
        reason: "LEASE_HELD",
      },
      {
        status: 202,
        headers: noStoreHeaders(),
      },
    );
  }

  try {
    const previous = await prisma.contentSeoSnapshot.findFirst({ orderBy: { recordedFor: "desc" } });
    const oldIssues = Array.isArray(previous?.issues) ? previous.issues : [];
    const last = oldIssues.find(item => item && typeof item === "object" && !Array.isArray(item) && item.id === "SEO_AUTOPILOT_RUN") as { cursor?: SeoCursor; performance?: unknown; performanceAt?: string; pageScan?: Awaited<ReturnType<typeof scanSeoPages>> } | undefined;
    const repairs = await repairSeoBatch(last?.cursor);
    const result = await recordContentSeoSnapshot();
    const needsPerformance = seoAutomationEnabled() && (!last?.performanceAt || Date.now() - Date.parse(last.performanceAt) > 86400000);
    const pageScan = seoAutomationEnabled() ? await scanSeoPages(last?.pageScan?.nextOffset) : null;
    if (pageScan && last?.pageScan?.pages) {
      const currentUrls = new Set(pageScan.pages.map(p => p.url));
      pageScan.pages = [...pageScan.pages, ...last.pageScan.pages.filter(p => !currentUrls.has(p.url))].slice(0, 1000);
    }
    const performance = needsPerformance ? await measureSeoPerformance() : last?.performance || [];
    const snapshot = await prisma.contentSeoSnapshot.findFirst({ orderBy: { recordedFor: "desc" } });
    if (snapshot) await prisma.contentSeoSnapshot.update({ where: { id: snapshot.id }, data: { issues: JSON.parse(JSON.stringify([
      ...result.health.issues,
      { id: "SEO_AUTOPILOT_RUN", severity: "LOW", title: "گزارش خودکار سئو", detail: `${repairs.changed} اصلاح در آخرین نوبت`, action: "گزارش پنل سئو", checkedAt: new Date().toISOString(), ...repairs, pageScan, performance, performanceAt: needsPerformance ? new Date().toISOString() : last?.performanceAt }
    ])) as Prisma.InputJsonValue } });

    return NextResponse.json(
      {
        successful: true,
        snapshotCreated: result.created,
        repairs,
        health: result.health,
      },
      {
        headers: noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error("[Eloria Cron] Content SEO health job failed.", error);

    return NextResponse.json(
      {
        successful: false,
        code: "CONTENT_SEO_HEALTH_FAILED",
      },
      {
        status: 503,
        headers: noStoreHeaders(),
      },
    );
  } finally {
    await releaseCronLease("content-health", lease.holder).catch(
      () => undefined,
    );
  }
}
