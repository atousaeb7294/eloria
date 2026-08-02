import { Prisma } from "@/generated/prisma/client";
import { sendSms } from "@/lib/notifications/kavenegar";
import { isZarinpalConfigured, requestZarinpalPayment, verifyZarinpalPayment, zarinpalStartUrl } from "@/lib/payment/zarinpal";
import { prisma } from "@/lib/prisma";

function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; }
function callbackBase() { return (process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000"); }

export async function initiateOrderPayment(orderId: string) {
  if (!isZarinpalConfigured()) return { configured: false, redirectUrl: null, message: "درگاه پرداخت پیکربندی نشده است." };
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { payments: { where: { provider: "ZARINPAL", status: { in: ["CREATED", "REDIRECTED", "PENDING_VERIFICATION"] } }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order) throw new Error("سفارش پیدا نشد.");
  if (!["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status)) throw new Error("این سفارش در وضعیت قابل پرداخت نیست.");
  if (order.paidAt || order.inventoryCommittedAt) throw new Error("این سفارش قبلاً پرداخت یا قطعی شده است.");
  if (order.inventoryReleasedAt || order.inventoryExpiresAt.getTime() <= Date.now()) {
    throw new Error("مهلت رزرو موجودی این سفارش پایان یافته است. سفارش را دوباره ثبت کنید.");
  }
  const existing = order.payments[0];
  if (existing?.gatewayAuthority) return { configured: true, redirectUrl: zarinpalStartUrl(existing.gatewayAuthority), message: "درخواست پرداخت قبلی بازیابی شد." };

  const attempt = await prisma.paymentAttempt.create({ data: { orderId, provider: "ZARINPAL", amountToman: order.payableToman, status: "CREATED", requestPayload: json({ orderNumber: order.orderNumber }) } });
  try {
    const callbackUrl = `${callbackBase()}/api/payments/zarinpal/callback?orderId=${encodeURIComponent(order.id)}&locale=${encodeURIComponent(order.locale)}`;
    const result = await requestZarinpalPayment({ amountToman: order.payableToman.toString(), description: `پرداخت سفارش ${order.orderNumber} الوریا`, callbackUrl, mobile: order.customerMobile, email: order.customerEmail });
    const redirectUrl = zarinpalStartUrl(result.authority);
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "REDIRECTED", gatewayAuthority: result.authority, responsePayload: json(result), redirectedAt: new Date() } });
    await prisma.orderAuditEvent.create({ data: { orderId, actorType: "SYSTEM", eventType: "PAYMENT_REDIRECT_CREATED", payload: json({ provider: "ZARINPAL", authority: result.authority }) } });
    return { configured: true, redirectUrl, message: "انتقال به درگاه آماده است." };
  } catch (error) {
    await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", failedAt: new Date(), errorMessage: error instanceof Error ? error.message : "Payment request failed" } });
    throw error;
  }
}

export async function verifyOrderPayment(input: { orderId: string; authority: string; gatewayStatus: string }) {
  const order = await prisma.order.findUnique({ where: { id: input.orderId }, include: { payments: { where: { provider: "ZARINPAL", gatewayAuthority: input.authority }, orderBy: { createdAt: "desc" }, take: 1 } } });
  if (!order || !order.payments[0]) throw new Error("تلاش پرداخت متناظر پیدا نشد.");
  const attempt = order.payments[0];
  if (order.status === "PAID" && attempt.status === "PAID") return { successful: true, orderNumber: order.orderNumber, referenceId: attempt.gatewayReference ?? "" };
  if (input.gatewayStatus.toUpperCase() !== "OK") {
    await prisma.$transaction([
      prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "CANCELLED", callbackReceivedAt: new Date(), callbackPayload: json({ Status: input.gatewayStatus, Authority: input.authority }) } }),
      prisma.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED" } }),
      prisma.orderAuditEvent.create({ data: { orderId: order.id, actorType: "PAYMENT_GATEWAY", eventType: "PAYMENT_CANCELLED", payload: json({ authority: input.authority, status: input.gatewayStatus }) } }),
    ]);
    return { successful: false, orderNumber: order.orderNumber, referenceId: "" };
  }
  await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "PENDING_VERIFICATION", callbackReceivedAt: new Date(), callbackPayload: json({ Status: input.gatewayStatus, Authority: input.authority }) } });
  try {
    const verified = await verifyZarinpalPayment({ amountToman: order.payableToman.toString(), authority: input.authority });
    const now = new Date();
    await prisma.$transaction(async tx => {
      await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "PAID", gatewayReference: verified.referenceId, verificationPayload: json(verified), verifiedAt: now } });
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID", paidAt: order.paidAt ?? now, inventoryCommittedAt: order.inventoryCommittedAt ?? now } });
      await tx.orderAuditEvent.create({ data: { orderId: order.id, actorType: "PAYMENT_GATEWAY", eventType: "PAYMENT_VERIFIED", payload: json({ authority: input.authority, referenceId: verified.referenceId, code: verified.code }) } });
    });
    if (order.customerMobile) {
      const sms = await sendSms(order.customerMobile, `الوریا: پرداخت سفارش ${order.orderNumber} با موفقیت تأیید شد. کد پیگیری پرداخت: ${verified.referenceId ?? "-"}`);
      await prisma.orderAuditEvent.create({ data: { orderId: order.id, actorType: "SYSTEM", eventType: sms.successful ? "SMS_SENT" : "SMS_FAILED", payload: json({ type: "PAYMENT_CONFIRMED", ...sms }) } });
    }
    return { successful: true, orderNumber: order.orderNumber, referenceId: verified.referenceId ?? "" };
  } catch (error) {
    await prisma.$transaction([
      prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: "FAILED", failedAt: new Date(), errorMessage: error instanceof Error ? error.message : "Verification failed" } }),
      prisma.order.update({ where: { id: order.id }, data: { status: "PAYMENT_FAILED" } }),
      prisma.orderAuditEvent.create({ data: { orderId: order.id, actorType: "PAYMENT_GATEWAY", eventType: "PAYMENT_VERIFICATION_FAILED", payload: json({ authority: input.authority, message: error instanceof Error ? error.message : "Verification failed" }) } }),
    ]);
    throw error;
  }
}
