import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminOrderTransition = "CANCELLED" | "PROCESSING" | "SHIPPED" | "COMPLETED";

const ALLOWED: Record<string, AdminOrderTransition[]> = {
  PENDING_PAYMENT: ["CANCELLED"],
  PAYMENT_FAILED: ["CANCELLED"],
  PAID: ["PROCESSING"],
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

async function restoreReservedInventory(transaction: Prisma.TransactionClient, orderId: string) {
  const items = await transaction.orderItem.findMany({
    where: { orderId },
    select: { id: true, productId: true, variantId: true, quantity: true },
  });
  const issues: Array<Record<string, unknown>> = [];
  let restoredUnits = 0;

  for (const item of items) {
    if (item.variantId) {
      const updated = await transaction.productVariant.updateMany({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
      if (updated.count === 1) restoredUnits += item.quantity;
      else issues.push({ itemId: item.id, reason: "VARIANT_NOT_FOUND" });
      continue;
    }
    if (item.productId) {
      const updated = await transaction.product.updateMany({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
      if (updated.count === 1) restoredUnits += item.quantity;
      else issues.push({ itemId: item.id, reason: "PRODUCT_NOT_FOUND" });
      continue;
    }
    issues.push({ itemId: item.id, reason: "INVENTORY_REFERENCE_MISSING" });
  }

  return { restoredUnits, issues };
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
    } else if (target === "PROCESSING") {
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
