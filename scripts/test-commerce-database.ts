import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { releaseExpiredCheckoutOrders } from "../src/lib/expired-order-release";
import { verifyOrderPayment } from "../src/lib/payment-service";
import { markReviewedPaymentRefunded } from "../src/lib/order-operations";
import { databasePool, prisma } from "../src/lib/prisma";

async function createFixture(input: {
  status?: "PENDING_PAYMENT" | "PAID";
  attemptStatus?: "PENDING_VERIFICATION" | "PAID";
  activeLease?: boolean;
}) {
  const suffix = randomUUID().slice(0, 8);
  const collection = await prisma.collection.create({
    data: {
      slug: `audit-${suffix}`,
      nameFa: "ممیزی",
      nameEn: "Audit",
      isActive: false,
    },
  });
  const product = await prisma.product.create({
    data: {
      collectionId: collection.id,
      slug: `audit-product-${suffix}`,
      nameFa: "محصول ممیزی",
      nameEn: "Audit product",
      pricingMode: "MANUAL",
      price: "100000",
      stock: 0,
      status: "OUT_OF_STOCK",
    },
  });
  const now = new Date();
  const status = input.status ?? "PENDING_PAYMENT";
  const order = await prisma.order.create({
    data: {
      orderNumber: `AUD-${suffix}`.toUpperCase(),
      idempotencyKey: `audit:${randomUUID()}`,
      locale: "fa",
      status,
      customerFullName: "Audit User",
      customerMobile: `0900${Math.floor(Math.random() * 1_000_0000).toString().padStart(7, "0")}`,
      subtotalToman: "100000",
      payableToman: "100000",
      pricingSnapshot: { audit: true },
      priceVerifiedAt: new Date(now.getTime() - 60_000),
      priceExpiresAt: new Date(now.getTime() + 60_000),
      inventoryReservedAt: new Date(now.getTime() - 60_000),
      inventoryExpiresAt: new Date(now.getTime() - 1_000),
      paidAt: status === "PAID" ? now : null,
      inventoryCommittedAt: status === "PAID" ? now : null,
      items: {
        create: {
          productId: product.id,
          productSlug: product.slug,
          productNameFa: product.nameFa,
          productNameEn: product.nameEn,
          material: "GOLD",
          quantity: 1,
          unitPriceToman: "100000",
          lineTotalToman: "100000",
          stockBeforeReservation: 1,
          stockAfterReservation: 0,
          pricingSnapshot: { audit: true },
        },
      },
    },
  });
  const authority = `A${randomUUID().replace(/-/g, "")}`;
  const attempt = await prisma.paymentAttempt.create({
    data: {
      orderId: order.id,
      provider: "ZARINPAL",
      status: input.attemptStatus ?? "PENDING_VERIFICATION",
      amountToman: "100000",
      gatewayAuthority: authority,
      gatewayReference: input.attemptStatus === "PAID" ? `R${suffix}` : null,
      verifiedAt: input.attemptStatus === "PAID" ? now : null,
      verificationStartedAt: input.activeLease ? now : null,
      verificationLeaseExpiresAt: input.activeLease ? new Date(now.getTime() + 120_000) : null,
    },
  });
  return { collection, product, order, attempt, authority };
}

async function cleanup(ids: { collectionId: string; productId: string; orderId: string }) {
  await prisma.order.deleteMany({ where: { id: ids.orderId } });
  await prisma.product.deleteMany({ where: { id: ids.productId } });
  await prisma.collection.deleteMany({ where: { id: ids.collectionId } });
}

async function testVerificationLeaseBlocksExpiry() {
  const fixture = await createFixture({ activeLease: true });
  try {
    const first = await releaseExpiredCheckoutOrders({ batchSize: 100, now: new Date(), orderIds: [fixture.order.id] });
    assert.equal(first.orders.some(item => item.orderId === fixture.order.id && item.released), false);
    const protectedOrder = await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } });
    assert.equal(protectedOrder.status, "PENDING_PAYMENT");
    assert.equal(protectedOrder.inventoryReleasedAt, null);

    await prisma.paymentAttempt.update({
      where: { id: fixture.attempt.id },
      data: { verificationLeaseExpiresAt: new Date(Date.now() - 1_000) },
    });
    const second = await releaseExpiredCheckoutOrders({ batchSize: 100, now: new Date(), orderIds: [fixture.order.id] });
    assert.equal(second.orders.some(item => item.orderId === fixture.order.id && item.released), true);
    const expiredOrder = await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } });
    const restoredProduct = await prisma.product.findUniqueOrThrow({ where: { id: fixture.product.id } });
    assert.equal(expiredOrder.status, "EXPIRED");
    assert.equal(restoredProduct.stock, 1);
    console.log("PASS  Active verification lease blocks inventory expiry");
  } finally {
    await cleanup({ collectionId: fixture.collection.id, productId: fixture.product.id, orderId: fixture.order.id });
  }
}

async function testStaleCallbackCannotDowngradePaidOrder() {
  const fixture = await createFixture({ status: "PAID", attemptStatus: "PAID" });
  try {
    const result = await verifyOrderPayment({
      orderId: fixture.order.id,
      authority: fixture.authority,
      gatewayStatus: "NOK",
    });
    assert.equal(result.successful, true);
    const order = await prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } });
    const attempt = await prisma.paymentAttempt.findUniqueOrThrow({ where: { id: fixture.attempt.id } });
    assert.equal(order.status, "PAID");
    assert.equal(attempt.status, "PAID");
    console.log("PASS  Stale callback cannot downgrade a paid order");
  } finally {
    await cleanup({ collectionId: fixture.collection.id, productId: fixture.product.id, orderId: fixture.order.id });
  }
}


async function testDuplicatePaymentRefundDoesNotChangeOrder() {
  const fixture = await createFixture({ status: "PAID", attemptStatus: "PAID" });
  try {
    const duplicate = await prisma.paymentAttempt.create({
      data: {
        orderId: fixture.order.id,
        provider: "ZARINPAL",
        status: "REQUIRES_REVIEW",
        amountToman: "100000",
        gatewayAuthority: `A${randomUUID().replace(/-/g, "")}`,
        gatewayReference: `D${randomUUID().replace(/-/g, "").slice(0, 12)}`,
        verifiedAt: new Date(),
        errorMessage: "Duplicate payment fixture",
      },
    });

    await markReviewedPaymentRefunded({
      orderId: fixture.order.id,
      paymentAttemptId: duplicate.id,
      refundReference: "AUDIT-REFUND-123456",
      note: "Audit refund reference",
    });

    const [order, refundedAttempt, product] = await Promise.all([
      prisma.order.findUniqueOrThrow({ where: { id: fixture.order.id } }),
      prisma.paymentAttempt.findUniqueOrThrow({ where: { id: duplicate.id } }),
      prisma.product.findUniqueOrThrow({ where: { id: fixture.product.id } }),
    ]);

    assert.equal(order.status, "PAID");
    assert.equal(order.inventoryReleasedAt, null);
    assert.equal(refundedAttempt.status, "REFUNDED");
    assert.ok(refundedAttempt.refundedAt);
    assert.equal(product.stock, 0);
    console.log("PASS  Duplicate payment refund does not alter the paid order or inventory");
  } finally {
    await cleanup({ collectionId: fixture.collection.id, productId: fixture.product.id, orderId: fixture.order.id });
  }
}

async function main() {
  await testVerificationLeaseBlocksExpiry();
  await testStaleCallbackCannotDowngradePaidOrder();
  await testDuplicatePaymentRefundDoesNotChangeOrder();
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    await databasePool.end();
  });
