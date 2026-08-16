import "dotenv/config";
import { randomUUID } from "node:crypto";

async function main(): Promise<void> {
const { databasePool, prisma } = await import("../src/lib/prisma");

function expect(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const suffix = randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
const mobile = `0913${String(Number.parseInt(suffix.slice(0, 6), 36) % 10_000_000).padStart(7, "0")}`;
const now = new Date();
const later = new Date(now.getTime() + 30 * 60_000);

let customerId: string | null = null;
let orderId: string | null = null;

try {
  const customer = await prisma.customer.create({
    data: { mobile, isActive: true },
  });
  customerId = customer.id;

  await prisma.customerAddress.create({
    data: {
      customerId: customer.id,
      title: "Primary",
      recipientName: "Hardening Test",
      mobile,
      province: "Tehran",
      city: "Tehran",
      postalCode: "1234567890",
      address: "Hardening address one",
      isDefault: true,
    },
  });

  let secondDefaultRejected = false;
  try {
    await prisma.customerAddress.create({
      data: {
        customerId: customer.id,
        title: "Second",
        recipientName: "Hardening Test",
        mobile,
        province: "Tehran",
        city: "Tehran",
        postalCode: "1234567891",
        address: "Hardening address two",
        isDefault: true,
      },
    });
  } catch {
    secondDefaultRejected = true;
  }
  expect(
    secondDefaultRejected,
    "Database must reject two default addresses for one customer.",
  );

  const order = await prisma.order.create({
    data: {
      orderNumber: `HDB${suffix}`,
      idempotencyKey: `hardening-db-${suffix}-1234567890`,
      locale: "fa",
      customerId: customer.id,
      customerFullName: "Hardening Test",
      customerMobile: mobile,
      subtotalToman: "100000",
      shippingToman: "0",
      discountToman: "0",
      payableToman: "100000",
      pricingSnapshot: {},
      priceVerifiedAt: now,
      priceExpiresAt: later,
      inventoryReservedAt: now,
      inventoryExpiresAt: later,
    },
  });
  orderId = order.id;

  let refundWithoutReferenceRejected = false;
  try {
    await prisma.paymentAttempt.create({
      data: {
        orderId: order.id,
        provider: "HARDENING_TEST",
        status: "REFUNDED",
        amountToman: "100000",
      },
    });
  } catch {
    refundWithoutReferenceRejected = true;
  }
  expect(
    refundWithoutReferenceRejected,
    "Database must reject REFUNDED payment without refund reference/amount.",
  );

  const refundedAttempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id,
      provider: "HARDENING_TEST",
      status: "REFUNDED",
      amountToman: "100000",
      refundReference: `TEST-${suffix}`,
      refundAmountToman: "100000",
      refundedAt: now,
    },
  });
  expect(
    refundedAttempt.refundReference === `TEST-${suffix}`,
    "Refund reference must persist.",
  );

  let invalidNotificationOrderRejected = false;
  try {
    await prisma.customerNotification.create({
      data: {
        customerId: customer.id,
        type: "HARDENING_TEST",
        titleFa: "تست",
        titleEn: "Test",
        bodyFa: "تست",
        bodyEn: "Test",
        orderId: randomUUID(),
      },
    });
  } catch {
    invalidNotificationOrderRejected = true;
  }
  expect(
    invalidNotificationOrderRejected,
    "Customer notification must reject a nonexistent order FK.",
  );

  const shipment = await prisma.shipment.create({
    data: {
      orderId: order.id,
      carrier: "TEST_CARRIER",
      trackingCode: `TRACK-${suffix}`,
      status: "PROCESSING",
    },
  });
  expect(shipment.orderId === order.id, "Structured Shipment must persist.");

  console.log(
    "PASS  Hardening DB constraints: refund provenance, notification FK, one default address, shipment",
  );
} finally {
  if (orderId) {
    await prisma.order.deleteMany({ where: { id: orderId } });
  }
  if (customerId) {
    await prisma.customer.deleteMany({ where: { id: customerId } });
  }
  await prisma.$disconnect();
  await databasePool.end();
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
