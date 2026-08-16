import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { acquireCronLease, releaseCronLease } from "@/lib/cron-lease";
import { processSecurityAlertQueue } from "@/lib/security/security-alert-worker";

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
  if (!authorization?.startsWith("Bearer ")) return null;
  return authorization.slice("Bearer ".length).trim() || null;
}

function secretMatches(provided: string, configured: string): boolean {
  const left = Buffer.from(provided, "utf8");
  const right = Buffer.from(configured, "utf8");
  return left.length === right.length && timingSafeEqual(left, right);
}

function batchSize(request: NextRequest): number {
  const parsed = Number.parseInt(
    request.nextUrl.searchParams.get("batchSize") ?? "",
    10,
  );
  if (!Number.isFinite(parsed)) return 25;
  return Math.min(Math.max(parsed, 1), 100);
}

export async function GET(request: NextRequest) {
  const configured = process.env.CRON_SECRET?.trim() ?? "";
  const provided = bearer(request);

  if (configured.length < 32) {
    return NextResponse.json(
      {
        successful: false,
        code: "CRON_SECRET_NOT_CONFIGURED",
        message: "Server cron authentication is not configured.",
      },
      { status: 503, headers: noStoreHeaders() },
    );
  }

  if (!provided || !secretMatches(provided, configured)) {
    return NextResponse.json(
      {
        successful: false,
        code: "UNAUTHORIZED",
        message: "Valid bearer authorization is required.",
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
    key: "security-alerts",
    leaseMs: 120_000,
  });

  if (!lease.acquired) {
    return NextResponse.json(
      { successful: true, skipped: true, reason: "LEASE_HELD" },
      { status: 202, headers: noStoreHeaders() },
    );
  }

  try {
    const result = await processSecurityAlertQueue({
      batchSize: batchSize(request),
    });

    return NextResponse.json(
      { successful: true, ...result },
      {
        status: result.failed > 0 ? 207 : 200,
        headers: noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error("[Eloria Cron] Security alert delivery failed.", error);
    return NextResponse.json(
      {
        successful: false,
        code: "SECURITY_ALERT_DELIVERY_FAILED",
        message: "Security alert delivery failed.",
      },
      { status: 503, headers: noStoreHeaders() },
    );
  } finally {
    await releaseCronLease("security-alerts", lease.holder).catch(() => undefined);
  }
}
