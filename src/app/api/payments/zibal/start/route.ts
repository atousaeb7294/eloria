import { NextRequest, NextResponse } from "next/server";
import { initiateOrderPayment, PaymentServiceError } from "@/lib/payment-service";
import { ZibalError } from "@/lib/payment/zibal";
import { prisma } from "@/lib/prisma";
import { getCustomerFromRequest } from "@/lib/customer-auth";
import { readPaymentStartAuthorizationCookie, verifyPaymentStartAuthorization } from "@/lib/payment-start-authorization";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { readJsonBody, JsonRequestBodyError } from "@/lib/security/json-body";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failure(message: string, status: number) {
  return NextResponse.json({ successful: false, message }, { status, headers });
}
export async function POST(request: NextRequest) {
  try {
    if (!hasTrustedOrigin(request)) return failure("مبدأ درخواست معتبر نیست.", 403);
    const rate = await consumeRateLimit({ key: `payment-start:${requestIp(request)}`, limit: 12, windowMs: 60000 });
    if (!rate.allowed) return failure("لطفاً کمی بعد دوباره تلاش کنید.", 429);
    const body = await readJsonBody<{ orderId?: unknown } | null>(request, 4096);
    const orderId = typeof body?.orderId === "string" ? body.orderId.trim() : "";
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)) return failure("شناسه سفارش معتبر نیست.", 400);
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, customerId: true, customerMobile: true, payableToman: true } });
    if (!order) return failure("سفارش در دسترس نیست.", 403);
    const token = readPaymentStartAuthorizationCookie(request, orderId);
    const guest = token && verifyPaymentStartAuthorization(token, { orderId, amountToman: order.payableToman.toString(), mobile: order.customerMobile || "" });
    if (!guest) {
      const customer = await getCustomerFromRequest(request);
      if (!customer || order.customerId !== customer.customer.id) return failure("برای پرداخت این سفارش دوباره وارد حساب خود شوید.", 403);
    }
    const payment = await initiateOrderPayment(orderId);
    return NextResponse.json({ successful: payment.configured, payment }, { status: payment.configured ? 200 : 503, headers });
  } catch (error) {
    if (error instanceof PaymentServiceError || error instanceof JsonRequestBodyError) return failure(error.message, error.status);
    if (error instanceof ZibalError) return failure(error.message, 502);
    console.error("[Zibal Start]", error instanceof Error ? error.name : "UnknownError");
    return failure("شروع پرداخت انجام نشد؛ دوباره تلاش کنید.", 500);
  }
}
