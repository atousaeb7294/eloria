import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { databasePool, prisma } from "../src/lib/prisma";
import { normalizeIranMobile } from "../src/lib/customer-auth";
import { cancelCustomerOrder } from "../src/lib/customer-order-operations";

async function main() {
  assert.equal(normalizeIranMobile("+989121234567"), "09121234567");
  const suffix = randomUUID().replace(/-/g, "").slice(0, 7);
  const mobile = `0900${suffix.replace(/[^0-9]/g, "").padEnd(7, "1").slice(0, 7)}`;
  const customer = await prisma.customer.create({ data: { mobile, fullName: "Customer Audit", mobileVerifiedAt: new Date() } });
  try {
    const address = await prisma.customerAddress.create({
      data: { customerId: customer.id, title: "Test", recipientName: "Customer Audit", mobile, province: "Tehran", city: "Tehran", postalCode: "1234567890", address: "Test address", isDefault: true },
    });
    const notification = await prisma.customerNotification.create({
      data: { customerId: customer.id, type: "AUDIT", titleFa: "تست", titleEn: "Test", bodyFa: "تست حساب مشتری", bodyEn: "Customer account test" },
    });
    const order = await prisma.order.create({
      data: {
        orderNumber: `CUS-${suffix}`.toUpperCase(), idempotencyKey: `customer-audit:${randomUUID()}`, locale: "fa", customerId: customer.id,
        customerFullName: customer.fullName, customerMobile: mobile, subtotalToman: "1000", payableToman: "1000", pricingSnapshot: { audit: true },
        priceVerifiedAt: new Date(), priceExpiresAt: new Date(Date.now() + 60_000), inventoryReservedAt: new Date(), inventoryExpiresAt: new Date(Date.now() + 60_000),
      },
    });
    const loaded = await prisma.customer.findUniqueOrThrow({ where: { id: customer.id }, include: { addresses: true, notifications: true, orders: true } });
    assert.equal(loaded.addresses.some(x => x.id === address.id), true);
    assert.equal(loaded.notifications.some(x => x.id === notification.id), true);
    assert.equal(loaded.orders.some(x => x.id === order.id), true);
    console.log("PASS  Customer account database relations");
    await cancelCustomerOrder(customer.id, order.id);
    const cancelled = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(cancelled.status, "CANCELLED");
    assert.ok(cancelled.inventoryReleasedAt);
    console.log("PASS  Customer can safely cancel an unpaid order");
    await prisma.order.delete({ where: { id: order.id } });
  } finally {
    await prisma.customer.delete({ where: { id: customer.id } }).catch(() => undefined);
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await prisma.$disconnect().catch(() => undefined); await databasePool.end().catch(() => undefined); });
