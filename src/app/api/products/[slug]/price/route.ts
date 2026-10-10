import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getProductDisplayPrice, getProductLivePrice, ProductPricingError } from "@/lib/product-pricing";
import { withDatabaseStatementTimeout } from "@/lib/prisma";
import { createSingleFlight } from "@/lib/single-flight";

export const dynamic = "force-dynamic";
export const revalidate = 0;
const quoteFlight = createSingleFlight(16);

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const requestId = randomUUID();
  const started = performance.now();
  const headers = () => ({
    "Cache-Control": "private, no-store, max-age=0",
    "X-Request-ID": requestId,
    "Server-Timing": `quote;dur=${Math.round(performance.now() - started)}`,
  });
  try {
    const { slug } = await context.params;
    const variantId = request.nextUrl.searchParams.get("variantId");
    const display = request.nextUrl.searchParams.get("display") === "1";
    if (slug.length > 160 || (variantId?.length ?? 0) > 100) {
      return NextResponse.json({ successful: false, code: "INVALID_INPUT", requestId }, { status: 400, headers: headers() });
    }
    const result = await quoteFlight(JSON.stringify([slug, variantId, display]), () =>
      // One bounded transaction, no retry or stale financial cache. DB budget:
      // 1.5s admission + 5.5s transaction, below the UI's 12s timeout.
      withDatabaseStatementTimeout(3000, database =>
        (display ? getProductDisplayPrice : getProductLivePrice)({ slug, variantId, database }),
      { maxWait: 1500, timeout: 5500 }),
    );
    return NextResponse.json({ successful: true, ...result, requestId }, { headers: headers() });
  } catch (error) {
    if (error instanceof ProductPricingError) {
      return NextResponse.json({ successful: false, code: error.code, message: error.message, requestId }, { status: error.status, headers: headers() });
    }
    console.error("[Eloria Quote] unavailable", { requestId, durationMs: Math.round(performance.now() - started), errorType: error instanceof Error ? error.name : "Unknown", code: error && typeof error === "object" && "code" in error ? String(error.code).slice(0,32) : undefined });
    return NextResponse.json({ successful: false, code: "QUOTE_UNAVAILABLE", message: "بررسی قیمت موقتاً در دسترس نیست. دوباره تلاش کنید.", requestId }, { status: 503, headers: { ...headers(), "Retry-After": "3" } });
  }
}
