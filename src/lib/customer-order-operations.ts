import { Prisma } from "@/generated/prisma/client";
import { restoreReservedInventory } from "@/lib/inventory";
import { prisma, withDatabaseRetry } from "@/lib/prisma";

export async function cancelCustomerOrder(customerId: string, orderId: string) {
  return withDatabaseRetry(() => prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${orderId}::uuid FOR UPDATE`;
    const order = await tx.order.findFirst({
      where: { id: orderId, customerId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        inventoryCommittedAt: true,
        inventoryReleasedAt: true,
      },
    });
    if (!order) throw new Error("سفارش پیدا نشد.");
    if (!["PENDING_PAYMENT", "PAYMENT_FAILED"].includes(order.status)) {
      throw new Error("این سفارش دیگر قابل لغو مستقیم نیست.");
    }
    if (order.inventoryCommittedAt) throw new Error("موجودی این سفارش قطعی شده و لغو مستقیم مجاز نیست.");

    const now = new Date();
    const inventory = order.inventoryReleasedAt ? null : await restoreReservedInventory(tx, order.id);
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: "CANCELLED",
        cancelledAt: now,
        inventoryReleasedAt: order.inventoryReleasedAt ?? now,
      },
    });
    await tx.orderAuditEvent.create({
      data: {
        orderId: order.id,
        actorType: "CUSTOMER",
        eventType: "CUSTOMER_ORDER_CANCELLED",
        payload: { inventory },
      },
    });
    await tx.customerNotification.create({
      data: {
        customerId,
        type: "ORDER_CANCELLED",
        titleFa: "سفارش لغو شد",
        titleEn: "Order cancelled",
        bodyFa: `سفارش ${order.orderNumber} لغو شد و رزرو موجودی آن آزاد شد.`,
        bodyEn: `Order ${order.orderNumber} was cancelled and its inventory reservation was released.`,
        orderId: order.id,
      },
    });
    return { orderId: order.id, orderNumber: order.orderNumber };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 5_000, timeout: 20_000 }), { attempts: 2, delayMilliseconds: 200 });
}
