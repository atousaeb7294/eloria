import { timingSafeEqual } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { acquireCronLease, releaseCronLease } from "@/lib/cron-lease";
import { runContentAutopilot } from "@/lib/content-autopilot";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function headers() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

function authorised(request: NextRequest): boolean {
  const expected = process.env.CRON_SECRET?.trim() ?? "";
  const supplied =
    request.headers
      .get("authorization")
      ?.replace(/^Bearer\s+/i, "")
      .trim() ?? "";
  const left = Buffer.from(expected, "utf8");
  const right = Buffer.from(supplied, "utf8");

  return (
    expected.length >= 48 &&
    left.length === right.length &&
    timingSafeEqual(left, right)
  );
}

export async function GET(request: NextRequest) {
  if (!authorised(request)) {
    return NextResponse.json(
      { successful: false, code: "UNAUTHORIZED" },
      { status: 401, headers: headers() },
    );
  }

  const lease = await acquireCronLease({
    key: "content-drafts",
    leaseMs: 10 * 60_000,
  });

  if (!lease.acquired) {
    return NextResponse.json(
      { successful: true, skipped: true, reason: "LEASE_HELD" },
      { status: 202, headers: headers() },
    );
  }

  try {
    const result = await runContentAutopilot();

    return NextResponse.json(
      { successful: true, ...result },
      { headers: headers() },
    );
  } catch (error) {
    console.error("[eloria cron] content draft job failed", error);

    return NextResponse.json(
      { successful: false, code: "CONTENT_AUTOPILOT_FAILED" },
      { status: 503, headers: headers() },
    );
  } finally {
    await releaseCronLease("content-drafts", lease.holder).catch(
      () => undefined,
    );
  }
}
