import { NextRequest, NextResponse } from "next/server";
import { verifyOrderPayment } from "@/lib/payment-service";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { requestIp } from "@/lib/security/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: NextRequest) {
  const rate = consumeRateLimit({ key: `payment-callback:${requestIp(request)}`, limit: 30, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ successful: false, message: "Too many callbacks" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  const url = request.nextUrl;
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";
  const authority = url.searchParams.get("Authority")?.trim() ?? "";
  const status = url.searchParams.get("Status")?.trim() ?? "";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fa";
  if (!orderId || !authority) return NextResponse.redirect(new URL(`/${locale}/order/failed?reason=invalid-callback`, request.url));
  try {
    const result = await verifyOrderPayment({ orderId, authority, gatewayStatus: status });
    const target = result.successful ? "success" : "failed";
    return NextResponse.redirect(new URL(`/${locale}/order/${target}?order=${encodeURIComponent(result.orderNumber)}&ref=${encodeURIComponent(result.referenceId)}`, request.url));
  } catch (error) {
    console.error("[Eloria Payment Callback]", error);
    return NextResponse.redirect(new URL(`/${locale}/order/failed?orderId=${encodeURIComponent(orderId)}&reason=verification-failed`, request.url));
  }
}
