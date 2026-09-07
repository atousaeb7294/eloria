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
    leaseMs: 120_000,
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
    const result = await recordContentSeoSnapshot();

    return NextResponse.json(
      {
        successful: true,
        snapshotCreated: result.created,
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
