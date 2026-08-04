import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/admin-auth";
import { productionEnvironmentChecks } from "@/lib/env-validation";
import { isKavenegarConfigured } from "@/lib/notifications/kavenegar";
import { isZarinpalConfigured } from "@/lib/payment/zarinpal";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  const startedAt = Date.now();
  let database = false;
  try { await prisma.$queryRaw`SELECT 1`; database = true; } catch { database = false; }
  const healthy = database;
  return NextResponse.json({
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    responseTimeMs: Date.now() - startedAt,
    checks: { database, admin: isAdminConfigured(), payment: isZarinpalConfigured(), sms: isKavenegarConfigured(), environment: productionEnvironmentChecks().filter(item => item.required).every(item => item.valid) },
  }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
