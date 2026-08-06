import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

import { isAdminConfigured } from "@/lib/admin-auth";
import { productionEnvironmentChecks } from "@/lib/env-validation";
import { isKavenegarConfigured } from "@/lib/notifications/kavenegar";
import { isZarinpalConfigured } from "@/lib/payment/zarinpal";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, "utf8");
  const b = Buffer.from(right, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

function canSeeDetails(request: NextRequest): boolean {
  const configured = process.env.CRON_SECRET?.trim() ?? "";
  const supplied = request.headers.get("x-eloria-health-secret")?.trim() ?? "";
  return configured.length >= 32 && supplied.length > 0 && safeEqual(supplied, configured);
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();
  const mode = request.nextUrl.searchParams.get("mode") === "live" ? "live" : "ready";

  if (mode === "live") {
    return NextResponse.json(
      {
        status: "ok",
        mode,
        timestamp: new Date().toISOString(),
        responseTimeMs: Date.now() - startedAt,
      },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  let database = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    database = true;
  } catch (error) {
    console.error("[Eloria Health] Database readiness check failed.", error);
  }

  const requiredEnvironment = productionEnvironmentChecks()
    .filter(item => item.required)
    .every(item => item.valid);
  const ready = database && requiredEnvironment;
  const base = {
    status: ready ? "ok" : "degraded",
    mode,
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
  };

  return NextResponse.json(
    canSeeDetails(request)
      ? {
          ...base,
          checks: {
            database,
            environment: requiredEnvironment,
            admin: isAdminConfigured(),
            payment: isZarinpalConfigured(),
            sms: isKavenegarConfigured(),
          },
        }
      : base,
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
