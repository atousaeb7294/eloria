import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { restoreReservedInventory } from "@/lib/inventory";

export type AdminOrderTransition = "CANCELLED" | "PROCESSING" | "SHIPPED" | "COMPLETED" | "REFUNDED";

const ALLOWED: Record<string, AdminOrderTransition[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_FAILED: ["CANCELLED"],
  PAID: ["PROCESSING", "REFUNDED"],
  PAYMENT_REVIEW: ["PROCESSING", "REFUNDED"],
  PROCESSING: ["SHIPPED"],
  SHIPPED: ["COMPLETED"],
};

function json(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export class OrderOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderOperationError";
  }
}

export async function transitionOrderByAdmin({
  orderId,
  target,
  note,
}: {
  orderId: string;
  target: AdminOrderTransition;
  note: string | null;
}) {
  return prisma.$transaction(async transaction => {
    const order = await transaction.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        inventoryReleasedAt: true,
        inventoryCommittedAt: true,
      },
    });
    if (!order) throw new OrderOperationError("سفارش پیدا نشد.");
    if (!(ALLOWED[order.status] ?? []).includes(target)) {
      throw new OrderOperationError("این تغییر وضعیت برای سفارش فعلی مجاز نیست.");
    }

    const now = new Date();
    let inventoryResult: unknown = null;

    if (target === "CANCELLED") {
      if (order.inventoryCommittedAt) throw new OrderOperationError("موجودی این سفارش قطعی شده و لغو مستقیم مجاز نیست.");
      if (!order.inventoryReleasedAt) inventoryResult = await restoreReservedInventory(transaction, orderId);
      await transaction.order.update({
        where: { id: orderId },
        data: { status: "CANCELLED", cancelledAt: now, inventoryReleasedAt: order.inventoryReleasedAt ?? now },
      });
    } else if (target === "REFUNDED") {
      if (!order.inventoryReleasedAt) inventoryResult = await restoreReservedInventory(transaction, orderId);
      await transaction.paymentAttempt.updateMany({
        where: { orderId, status: { in: ["PAID", "REQUIRES_REVIEW"] } },
        data: { status: "REFUNDED", activeKey: null, refundedAt: now },
      });
      await transaction.order.update({
        where: { id: orderId },
        data: {
          status: "REFUNDED",
          refundedAt: now,
          inventoryReleasedAt: order.inventoryReleasedAt ?? now,
        },
      });
    } else if (target === "PROCESSING") {
      if (order.status === "PAYMENT_REVIEW") {
        if (order.inventoryReleasedAt) {
          throw new OrderOperationError(
            "موجودی این پرداخت قبلاً آزاد شده است؛ ابتدا موجودی را دستی بررسی کنید و در صورت نبود کالا بازپرداخت انجام دهید.",
          );
        }
        await transaction.paymentAttempt.updateMany({
          where: { orderId, status: "REQUIRES_REVIEW" },
          data: { status: "PAID", activeKey: null, errorMessage: null },
        });
      }
      await transaction.order.update({
        where: { id: orderId },
        data: { status: "PROCESSING", inventoryCommittedAt: order.inventoryCommittedAt ?? now },
      });
    } else if (target === "SHIPPED") {
      await transaction.order.update({ where: { id: orderId }, data: { status: "SHIPPED" } });
    } else {
      await transaction.order.update({ where: { id: orderId }, data: { status: "COMPLETED" } });
    }

    await transaction.orderAuditEvent.create({
      data: {
        orderId,
        actorType: "ADMIN",
        eventType: "ADMIN_STATUS_CHANGED",
        payload: json({ from: order.status, to: target, note, inventoryResult }),
      },
    });

    return { orderNumber: order.orderNumber, from: order.status, to: target };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}


export async function markReviewedPaymentRefunded({
  orderId,
  paymentAttemptId,
  note,
}: {
  orderId: string;
  paymentAttemptId: string;
  note: string | null;
}) {
  return prisma.$transaction(async transaction => {
    await transaction.$queryRaw`SELECT id FROM payment_attempts WHERE id = ${paymentAttemptId}::uuid FOR UPDATE`;

    const attempt = await transaction.paymentAttempt.findFirst({
      where: { id: paymentAttemptId, orderId },
      select: {
        id: true,
        status: true,
        gatewayReference: true,
        amountToman: true,
      },
    });

    if (!attempt) throw new OrderOperationError("تلاش پرداخت پیدا نشد.");
    if (attempt.status !== "REQUIRES_REVIEW") {
      throw new OrderOperationError("فقط پرداخت نیازمند بررسی را می‌توان بازپرداخت‌شده ثبت کرد.");
    }

    const refundedAt = new Date();
    await transaction.paymentAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "REFUNDED",
        activeKey: null,
        refundedAt,
        errorMessage: note,
      },
    });

    await transaction.orderAuditEvent.create({
      data: {
        orderId,
        actorType: "ADMIN",
        eventType: "PAYMENT_ATTEMPT_MANUALLY_REFUNDED",
        payload: json({
          paymentAttemptId: attempt.id,
          gatewayReference: attempt.gatewayReference,
          amountToman: attempt.amountToman.toString(),
          note,
          refundedAt: refundedAt.toISOString(),
        }),
      },
    });

    return { paymentAttemptId: attempt.id };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function saveShipmentDetails({
  orderId,
  carrier,
  trackingCode,
  note,
}: {
  orderId: string;
  carrier: string;
  trackingCode: string;
  note: string | null;
}) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, status: true } });
  if (!order) throw new OrderOperationError("سفارش پیدا نشد.");
  if (!["PROCESSING", "SHIPPED"].includes(order.status)) {
    throw new OrderOperationError("اطلاعات ارسال فقط برای سفارش در حال پردازش یا ارسال‌شده ثبت می‌شود.");
  }
  await prisma.orderAuditEvent.create({
    data: {
      orderId,
      actorType: "ADMIN",
      eventType: "SHIPMENT_DETAILS_UPDATED",
      payload: json({ carrier, trackingCode, note }),
    },
  });
}

export function availableAdminTransitions(status: string): AdminOrderTransition[] {
  return ALLOWED[status] ?? [];
}
