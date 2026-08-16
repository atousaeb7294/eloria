import { NextRequest, NextResponse } from "next/server";
import { initiateOrderPayment, PaymentServiceError } from "@/lib/payment-service";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
import { readJsonBody } from "@/lib/security/json-body";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const rate = await consumeRateLimit({ key: `payment-start:${requestIp(request)}`, limit: 8, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ successful: false, message: "درخواست‌های پرداخت بیش از حد مجاز است." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  const body = await readJsonBody<{ orderId?: unknown; mobile?: unknown }>(request, 8 * 1024).catch(() => null);
  if (!body || typeof body.orderId !== "string" || typeof body.mobile !== "string") return NextResponse.json({ successful: false, message: "اطلاعات پرداخت معتبر نیست." }, { status: 400 });
  const order = await prisma.order.findFirst({ where: { id: body.orderId, customerMobile: body.mobile.trim() }, select: { id: true } });
  if (!order) return NextResponse.json({ successful: false, message: "سفارش پیدا نشد." }, { status: 404 });
  try {
    const payment = await initiateOrderPayment(order.id);
    return NextResponse.json({ successful: true, payment });
  } catch (error) {
    if (error instanceof PaymentServiceError) {
      return NextResponse.json(
        { successful: false, message: error.message },
        { status: error.status, headers: { "Cache-Control": "no-store" } },
      );
    }
    console.error("[Eloria Payment Start] Unexpected payment initialization error.", error);
    return NextResponse.json(
      { successful: false, message: "ارتباط با درگاه پرداخت انجام نشد. لطفاً دوباره تلاش کنید." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
