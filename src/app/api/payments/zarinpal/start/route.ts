import { NextRequest, NextResponse } from "next/server";
import { initiateOrderPayment } from "@/lib/payment-service";
import { prisma } from "@/lib/prisma";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: NextRequest) {
  if (!hasTrustedOrigin(request)) return NextResponse.json({ successful: false, message: "مبدأ درخواست معتبر نیست." }, { status: 403 });
  const rate = consumeRateLimit({ key: `payment-start:${requestIp(request)}`, limit: 8, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ successful: false, message: "درخواست‌های پرداخت بیش از حد مجاز است." }, { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } });
  const body = await request.json().catch(() => null) as { orderId?: unknown; mobile?: unknown } | null;
  if (!body || typeof body.orderId !== "string" || typeof body.mobile !== "string") return NextResponse.json({ successful: false, message: "اطلاعات پرداخت معتبر نیست." }, { status: 400 });
  const order = await prisma.order.findFirst({ where: { id: body.orderId, customerMobile: body.mobile.trim() }, select: { id: true } });
  if (!order) return NextResponse.json({ successful: false, message: "سفارش پیدا نشد." }, { status: 404 });
  try {
    const payment = await initiateOrderPayment(order.id);
    return NextResponse.json({ successful: true, payment });
  } catch (error) {
    return NextResponse.json({ successful: false, message: error instanceof Error ? error.message : "ساخت پرداخت ناموفق بود." }, { status: 400 });
  }
}
