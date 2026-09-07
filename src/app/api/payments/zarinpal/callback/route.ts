import { NextRequest, NextResponse } from "next/server";
import { verifyOrderPayment } from "@/lib/payment-service";
import { createPaymentReceiptToken } from "@/lib/payment-receipt-token";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { requestIp } from "@/lib/security/request";
import { siteBaseUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rate = await consumeRateLimit({ key: `payment-callback:${requestIp(request)}`, limit: 30, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ successful: false, message: "Too many callbacks" }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });

  const url = request.nextUrl;
  const orderId = url.searchParams.get("orderId")?.trim() ?? "";
  const authority = url.searchParams.get("Authority")?.trim() ?? "";
  const status = url.searchParams.get("Status")?.trim() ?? "";
  const locale = url.searchParams.get("locale") === "en" ? "en" : "fa";
  if (!orderId || !authority) return NextResponse.redirect(new URL(`/${locale}/order/failed?reason=invalid-callback`, siteBaseUrl()));

  try {
    const result = await verifyOrderPayment({ orderId, authority, gatewayStatus: status });
    const target = result.successful ? (result.requiresReview ? "review" : "success") : "failed";
    const receipt = createPaymentReceiptToken({
      orderId: result.orderId,
      attemptId: result.attemptId,
      outcome: target,
    });
    return NextResponse.redirect(new URL(`/${locale}/order/${target}?receipt=${encodeURIComponent(receipt)}`, siteBaseUrl()));
  } catch (error) {
    console.error("[Eloria Payment Callback]", error);
    return NextResponse.redirect(new URL(`/${locale}/order/failed?reason=verification-failed`, siteBaseUrl()));
  }
}
