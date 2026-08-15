import { Prisma } from "@/generated/prisma/client";
import { sendSms } from "@/lib/notifications/kavenegar";
import {
  isZarinpalConfigured,
  requestZarinpalPayment,
  verifyZarinpalPayment,
  zarinpalStartUrl,
} from "@/lib/payment/zarinpal";
import { prisma } from "@/lib/prisma";

const PROVIDER = "ZARINPAL";
const VERIFICATION_LEASE_MS = 10 * 60_000;
const TERMINAL_ORDER_STATUSES = new Set([
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "REFUNDED",
]);

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function callbackBase(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_SITE_URL برای پرداخت Production تنظیم نشده است.");
  }
  return "http://localhost:3000";
}

function activeKey(orderId: string): string {
  return `${PROVIDER}:${orderId}`;
}

function isUniqueError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function existingActiveAttempt(orderId: string) {
  return prisma.paymentAttempt.findFirst({
    where: {
      orderId,
      provider: PROVIDER,
      activeKey: activeKey(orderId),
      status: { in: ["CREATED", "REDIRECTED", "PENDING_VERIFICATION"] },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function initiateOrderPayment(orderId: string) {
  if (!isZarinpalConfigured()) {
    return { configured: false, redirectUrl: null, message: "درگاه پرداخت پیکربندی نشده است." };
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("سفارش پیدا نشد.");
  if (!["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status)) {
    throw new Error("این سفارش در وضعیت قابل پرداخت نیست.");
  }
  if (order.paidAt || order.inventoryCommittedAt) {
    throw new Error("این سفارش قبلاً پرداخت یا قطعی شده است.");
  }
  if (order.inventoryReleasedAt || order.inventoryExpiresAt.getTime() <= Date.now()) {
    throw new Error("مهلت رزرو موجودی این سفارش پایان یافته است. سفارش را دوباره ثبت کنید.");
  }

  let existing = await existingActiveAttempt(orderId);
  if (existing && !existing.gatewayAuthority && existing.createdAt.getTime() < Date.now() - 2 * 60_000) {
    await prisma.paymentAttempt.updateMany({
      where: { id: existing.id, status: "CREATED", gatewayAuthority: null },
      data: { status: "FAILED", activeKey: null, failedAt: new Date(), errorMessage: "Stale payment initialization" },
    });
    existing = null;
  }
  if (existing?.gatewayAuthority) {
    return {
      configured: true,
      redirectUrl: zarinpalStartUrl(existing.gatewayAuthority),
      message: "درخواست پرداخت قبلی بازیابی شد.",
    };
  }

  let attempt;
  try {
    attempt = await prisma.paymentAttempt.create({
      data: {
        orderId,
        provider: PROVIDER,
        amountToman: order.payableToman,
        status: "CREATED",
        activeKey: activeKey(orderId),
        requestPayload: json({ orderNumber: order.orderNumber }),
      },
    });
  } catch (error) {
    if (!isUniqueError(error)) throw error;
    const concurrent = await existingActiveAttempt(orderId);
    if (concurrent?.gatewayAuthority) {
      return {
        configured: true,
        redirectUrl: zarinpalStartUrl(concurrent.gatewayAuthority),
        message: "درخواست پرداخت هم‌زمان بازیابی شد.",
      };
    }
    throw new Error("یک درخواست پرداخت دیگر در حال ساخته‌شدن است. چند ثانیه بعد دوباره تلاش کنید.");
  }

  try {
    const callbackUrl = `${callbackBase()}/api/payments/zarinpal/callback?orderId=${encodeURIComponent(order.id)}&locale=${encodeURIComponent(order.locale)}`;
    const result = await requestZarinpalPayment({
      amountToman: order.payableToman.toString(),
      description: `پرداخت سفارش ${order.orderNumber} الوریا`,
      callbackUrl,
      mobile: order.customerMobile,
      email: order.customerEmail,
    });
    const redirectUrl = zarinpalStartUrl(result.authority);

    await prisma.$transaction([
      prisma.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "REDIRECTED",
          gatewayAuthority: result.authority,
          responsePayload: json(result),
          redirectedAt: new Date(),
        },
      }),
      prisma.orderAuditEvent.create({
        data: {
          orderId,
          actorType: "SYSTEM",
          eventType: "PAYMENT_REDIRECT_CREATED",
          payload: json({ provider: PROVIDER, authority: result.authority, attemptId: attempt.id }),
        },
      }),
    ]);

    return { configured: true, redirectUrl, message: "انتقال به درگاه آماده است." };
  } catch (error) {
    await prisma.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "FAILED",
        activeKey: null,
        failedAt: new Date(),
        errorMessage: error instanceof Error ? error.message : "Payment request failed",
      },
    });
    throw error;
  }
}

export async function verifyOrderPayment(input: {
  orderId: string;
  authority: string;
  gatewayStatus: string;
}) {
  const now = new Date();
  const leaseUntil = new Date(now.getTime() + VERIFICATION_LEASE_MS);
  const order = await prisma.order.findUnique({
    where: { id: input.orderId },
    include: {
      payments: {
        where: { provider: PROVIDER, gatewayAuthority: input.authority },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!order || !order.payments[0]) throw new Error("تلاش پرداخت متناظر پیدا نشد.");
  const attempt = order.payments[0];

  if (attempt.status === "PAID" || attempt.status === "REQUIRES_REVIEW") {
    return {
      successful: true,
      orderNumber: order.orderNumber,
      referenceId: attempt.gatewayReference ?? "",
      requiresReview: attempt.status === "REQUIRES_REVIEW" || order.status === "PAYMENT_REVIEW",
      orderId: order.id,
      attemptId: attempt.id,
    };
  }

  if (input.gatewayStatus.toUpperCase() !== "OK") {
    if (TERMINAL_ORDER_STATUSES.has(order.status)) {
      await prisma.orderAuditEvent.create({
        data: {
          orderId: order.id,
          actorType: "PAYMENT_GATEWAY",
          eventType: "STALE_PAYMENT_CALLBACK_IGNORED",
          payload: json({ authority: input.authority, gatewayStatus: input.gatewayStatus, orderStatus: order.status }),
        },
      });
      return {
        successful: false,
        orderNumber: order.orderNumber,
        referenceId: "",
        requiresReview: false,
        orderId: order.id,
        attemptId: attempt.id,
      };
    }
    await prisma.$transaction(async tx => {
      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "CANCELLED",
          activeKey: null,
          callbackReceivedAt: now,
          callbackPayload: json({ Status: input.gatewayStatus, Authority: input.authority }),
        },
      });
      await tx.order.updateMany({
        where: {
          id: order.id,
          status: { in: ["PENDING_PAYMENT", "PAYMENT_FAILED"] },
          paidAt: null,
        },
        data: { status: "PAYMENT_FAILED" },
      });
      await tx.orderAuditEvent.create({
        data: {
          orderId: order.id,
          actorType: "PAYMENT_GATEWAY",
          eventType: "PAYMENT_CANCELLED",
          payload: json({ authority: input.authority, status: input.gatewayStatus, attemptId: attempt.id }),
        },
      });
    });
    return { successful: false, orderNumber: order.orderNumber, referenceId: "", requiresReview: false, orderId: order.id, attemptId: attempt.id };
  }

  const claimed = await prisma.paymentAttempt.updateMany({
    where: {
      id: attempt.id,
      status: { in: ["CREATED", "REDIRECTED", "PENDING_VERIFICATION"] },
      OR: [
        { verificationLeaseExpiresAt: null },
        { verificationLeaseExpiresAt: { lt: now } },
      ],
    },
    data: {
      status: "PENDING_VERIFICATION",
      callbackReceivedAt: now,
      callbackPayload: json({ Status: input.gatewayStatus, Authority: input.authority }),
      verificationStartedAt: now,
      verificationLeaseExpiresAt: leaseUntil,
    },
  });

  if (claimed.count !== 1) {
    const latest = await prisma.paymentAttempt.findUnique({ where: { id: attempt.id } });
    if (latest?.status === "PAID" || latest?.status === "REQUIRES_REVIEW") {
      return {
        successful: true,
        orderNumber: order.orderNumber,
        referenceId: latest.gatewayReference ?? "",
        requiresReview: latest.status === "REQUIRES_REVIEW",
        orderId: order.id,
        attemptId: attempt.id,
      };
    }
    throw new Error("تأیید این پرداخت هم‌اکنون در حال پردازش است.");
  }

  let verified: Awaited<ReturnType<typeof verifyZarinpalPayment>>;

  try {
    verified = await verifyZarinpalPayment({
      amountToman: order.payableToman.toString(),
      authority: input.authority,
    });
  } catch (error) {
    /*
     * خطای ارتباط یا پاسخ Verify نباید Authority را غیرقابل استفاده کند.
     * تلاش روی REDIRECTED باقی می‌ماند تا Callback یا بررسی بعدی بتواند
     * دوباره Verify را اجرا کند؛ موجودی نیز تا پایان رزرو آزاد نمی‌شود.
     */
    await prisma.$transaction(async tx => {
      await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "PENDING_VERIFICATION" },
        data: {
          status: "REDIRECTED",
          verificationLeaseExpiresAt: null,
          errorMessage: error instanceof Error ? error.message : "Verification request failed",
        },
      });
      await tx.orderAuditEvent.create({
        data: {
          orderId: order.id,
          actorType: "PAYMENT_GATEWAY",
          eventType: "PAYMENT_VERIFICATION_RETRY_REQUIRED",
          payload: json({
            authority: input.authority,
            message: error instanceof Error ? error.message : "Verification request failed",
          }),
        },
      });
    });
    throw error;
  }

  const verifiedAt = new Date();
  let finalState: { requiresReview: boolean } | null = null;
  let finalizationError: unknown = null;

  for (let finalizationAttempt = 1; finalizationAttempt <= 3; finalizationAttempt += 1) {
    try {
      finalState = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id}::uuid FOR UPDATE`;

        const [lockedOrder, lockedAttempt] = await Promise.all([
          tx.order.findUnique({ where: { id: order.id } }),
          tx.paymentAttempt.findUnique({ where: { id: attempt.id } }),
        ]);

        if (!lockedOrder || !lockedAttempt) {
          throw new Error("سفارش یا تلاش پرداخت هنگام ثبت نهایی پیدا نشد.");
        }

        if (lockedAttempt.status === "PAID") {
          return { requiresReview: false };
        }

        if (lockedAttempt.status === "REQUIRES_REVIEW") {
          return { requiresReview: true };
        }

        if (lockedAttempt.status !== "PENDING_VERIFICATION") {
          throw new Error(`وضعیت تلاش پرداخت برای ثبت نهایی معتبر نیست: ${lockedAttempt.status}`);
        }

        const alreadyPaidByAnotherAttempt =
          Boolean(lockedOrder.paidAt) &&
          TERMINAL_ORDER_STATUSES.has(lockedOrder.status);

        const inventoryAvailable =
          !alreadyPaidByAnotherAttempt &&
          !lockedOrder.inventoryReleasedAt &&
          !lockedOrder.cancelledAt &&
          !["CANCELLED", "EXPIRED", "REFUNDED"].includes(lockedOrder.status);

        const requiresReview = alreadyPaidByAnotherAttempt || !inventoryAvailable;
        const targetAttemptStatus = requiresReview ? "REQUIRES_REVIEW" : "PAID";

        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: targetAttemptStatus,
            activeKey: null,
            gatewayReference: verified.referenceId,
            verificationPayload: json(verified),
            verifiedAt,
            verificationLeaseExpiresAt: null,
            errorMessage: null,
          },
        });

        if (!alreadyPaidByAnotherAttempt) {
          await tx.order.update({
            where: { id: order.id },
            data: inventoryAvailable
              ? {
                  status: "PAID",
                  paidAt: lockedOrder.paidAt ?? verifiedAt,
                  inventoryCommittedAt: lockedOrder.inventoryCommittedAt ?? verifiedAt,
                }
              : {
                  status: "PAYMENT_REVIEW",
                  paidAt: lockedOrder.paidAt ?? verifiedAt,
                },
          });
        }

        await tx.orderAuditEvent.create({
          data: {
            orderId: order.id,
            actorType: "PAYMENT_GATEWAY",
            eventType: alreadyPaidByAnotherAttempt
              ? "DUPLICATE_PAYMENT_REQUIRES_REFUND"
              : inventoryAvailable
                ? "PAYMENT_VERIFIED"
                : "PAYMENT_VERIFIED_REQUIRES_REVIEW",
            payload: json({
              authority: input.authority,
              referenceId: verified.referenceId,
              code: verified.code,
              inventoryReleasedAt: lockedOrder.inventoryReleasedAt,
              previousStatus: lockedOrder.status,
              alreadyPaidByAnotherAttempt,
              finalizationAttempt,
            }),
          },
        });

        return { requiresReview };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

      break;
    } catch (error) {
      finalizationError = error;
      if (finalizationAttempt < 3) {
        await new Promise(resolve => setTimeout(resolve, 75 * finalizationAttempt));
      }
    }
  }

  if (!finalState) {
    /*
     * بانک پرداخت را تأیید کرده است، پس تحت هیچ شرایطی آن را FAILED نمی‌کنیم.
     * در صورت شکست ثبت نهایی، سفارش به صف بررسی دستی می‌رود تا پول مشتری
     * گم نشود و موجودی نیز به‌اشتباه قطعی تلقی نشود.
     */
    const failureMessage =
      finalizationError instanceof Error
        ? finalizationError.message
        : "Local payment finalization failed";

    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM orders WHERE id = ${order.id}::uuid FOR UPDATE`;
      const lockedOrder = await tx.order.findUnique({ where: { id: order.id } });
      if (!lockedOrder) throw new Error("سفارش برای ثبت وضعیت بررسی پیدا نشد.");

      if (["PAID", "PROCESSING", "SHIPPED", "COMPLETED"].includes(lockedOrder.status)) {
        await tx.paymentAttempt.update({
          where: { id: attempt.id },
          data: {
            status: "PAID",
            activeKey: null,
            gatewayReference: verified.referenceId,
            verificationPayload: json(verified),
            verifiedAt,
            verificationLeaseExpiresAt: null,
            errorMessage: null,
          },
        });
        finalState = { requiresReview: false };
        return;
      }

      await tx.paymentAttempt.update({
        where: { id: attempt.id },
        data: {
          status: "REQUIRES_REVIEW",
          activeKey: null,
          gatewayReference: verified.referenceId,
          verificationPayload: json(verified),
          verifiedAt,
          verificationLeaseExpiresAt: null,
          errorMessage: failureMessage,
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: "PAYMENT_REVIEW",
          paidAt: lockedOrder.paidAt ?? verifiedAt,
        },
      });

      await tx.orderAuditEvent.create({
        data: {
          orderId: order.id,
          actorType: "SYSTEM",
          eventType: "PAYMENT_FINALIZATION_REQUIRES_REVIEW",
          payload: json({
            authority: input.authority,
            referenceId: verified.referenceId,
            message: failureMessage,
          }),
        },
      });

      finalState = { requiresReview: true };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  if (!finalState) {
    throw new Error("پرداخت بانکی تأیید شد اما وضعیت نهایی سفارش ثبت نشد.");
  }

  // ELORIA_V3_PAYMENT_NOTIFICATION
  if (order.customerId) {
    await prisma.customerNotification.create({
      data: {
        customerId: order.customerId,
        type: finalState.requiresReview ? "PAYMENT_REVIEW" : "PAYMENT_CONFIRMED",
        titleFa: finalState.requiresReview ? "پرداخت دریافت شد؛ نیازمند بررسی" : "پرداخت تأیید شد",
        titleEn: finalState.requiresReview ? "Payment received; review required" : "Payment confirmed",
        bodyFa: finalState.requiresReview
          ? `پرداخت سفارش ${order.orderNumber} دریافت شد و برای بررسی نهایی در صف پشتیبانی قرار گرفت.`
          : `پرداخت سفارش ${order.orderNumber} با موفقیت تأیید شد.`,
        bodyEn: finalState.requiresReview
          ? `Payment for order ${order.orderNumber} was received and queued for review.`
          : `Payment for order ${order.orderNumber} was confirmed successfully.`,
        orderId: order.id,
      },
    }).catch(error => console.error("[Eloria Customer Notification] payment notification failed", error));
  }

  if (order.customerMobile) {
    const message = finalState.requiresReview
      ? `الوریا: پرداخت سفارش ${order.orderNumber} دریافت شد و برای بررسی موجودی در صف پشتیبانی قرار گرفت. کد پرداخت: ${verified.referenceId ?? "-"}`
      : `الوریا: پرداخت سفارش ${order.orderNumber} با موفقیت تأیید شد. کد پیگیری پرداخت: ${verified.referenceId ?? "-"}`;
    const sms = await sendSms(order.customerMobile, message);
    await prisma.orderAuditEvent.create({
      data: {
        orderId: order.id,
        actorType: "SYSTEM",
        eventType: sms.successful ? "SMS_SENT" : "SMS_FAILED",
        payload: json({ type: "PAYMENT_CONFIRMED", ...sms }),
      },
    });
  }

  return {
    successful: true,
    orderNumber: order.orderNumber,
    referenceId: verified.referenceId ?? "",
    requiresReview: finalState.requiresReview,
    orderId: order.id,
    attemptId: attempt.id,
  };
}
