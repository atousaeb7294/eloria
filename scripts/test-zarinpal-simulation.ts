import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import {
  verifyOrderPayment,
} from "../src/lib/payment-service";

import {
  ZarinpalError,
} from "../src/lib/payment/zarinpal";

import {
  databasePool,
  prisma,
} from "../src/lib/prisma";


/*
 * ============================================================
 * Deterministic test-only provider environment.
 *
 * No real Zarinpal request is ever allowed by this test.
 * All provider traffic is intercepted through global.fetch.
 * ============================================================
 */

process.env.ZARINPAL_MERCHANT_ID =
  "11111111-1111-1111-1111-111111111111";

/*
 * Prevent any real SMS / external alert delivery.
 */
process.env.KAVENEGAR_API_KEY =
  "";

process.env.KAVENEGAR_SENDER =
  "";

process.env.ELORIA_SECURITY_ALERT_MOBILE =
  "";

process.env.ELORIA_SECURITY_ALERT_WEBHOOK_URL =
  "";


const originalFetch =
  globalThis.fetch;


type FixtureInput = {
  orderStatus?:
    | "PENDING_PAYMENT"
    | "PAID";

  attemptStatus?:
    | "REDIRECTED"
    | "PAID";
};


const testSecurityEventTypes = [
  "PAYMENT_SUCCESS_WITHOUT_VALID_REFERENCE",
  "PAYMENT_VERIFICATION_RETRY_REQUIRED",
  "PAYMENT_STALE_CALLBACK_IGNORED",
];


async function createFixture(
  input: FixtureInput = {},
) {
  const startedAt =
    new Date(
      Date.now() -
        1_000,
    );

  const suffix =
    randomUUID()
      .replaceAll("-", "")
      .slice(0, 12);

  const collection =
    await prisma.collection.create({
      data: {
        slug:
          `zarinpal-simulation-${suffix}`,

        nameFa:
          "آزمون پرداخت",

        nameEn:
          "Payment simulation",

        isActive:
          false,
      },
    });

  const product =
    await prisma.product.create({
      data: {
        collectionId:
          collection.id,

        slug:
          `zarinpal-product-${suffix}`,

        nameFa:
          "محصول آزمون پرداخت",

        nameEn:
          "Payment simulation product",

        pricingMode:
          "MANUAL",

        price:
          "100000",

        stock:
          0,

        status:
          "OUT_OF_STOCK",
      },
    });

  const now =
    new Date();

  const orderStatus =
    input.orderStatus ??
    "PENDING_PAYMENT";

  const paid =
    orderStatus ===
    "PAID";

  const order =
    await prisma.order.create({
      data: {
        orderNumber:
          `ZPS-${suffix}`
            .toUpperCase()
            .slice(0, 32),

        idempotencyKey:
          `zarinpal-simulation:${randomUUID()}`,

        locale:
          "en",

        status:
          orderStatus,

        customerFullName:
          "ELORIA Payment Simulation",

        /*
         * Keep null so payment success never attempts SMS.
         */
        customerMobile:
          null,

        customerEmail:
          null,

        subtotalToman:
          "100000",

        shippingToman:
          "0",

        discountToman:
          "0",

        payableToman:
          "100000",

        pricingSnapshot: {
          test:
            "zarinpal-simulation",
        },

        priceVerifiedAt:
          new Date(
            now.getTime() -
              60_000,
          ),

        priceExpiresAt:
          new Date(
            now.getTime() +
              15 * 60_000,
          ),

        inventoryReservedAt:
          new Date(
            now.getTime() -
              60_000,
          ),

        inventoryExpiresAt:
          new Date(
            now.getTime() +
              15 * 60_000,
          ),

        paidAt:
          paid
            ? now
            : null,

        inventoryCommittedAt:
          paid
            ? now
            : null,

        items: {
          create: {
            productId:
              product.id,

            productSlug:
              product.slug,

            productNameFa:
              product.nameFa,

            productNameEn:
              product.nameEn,

            material:
              "GOLD",

            quantity:
              1,

            unitPriceToman:
              "100000",

            lineTotalToman:
              "100000",

            stockBeforeReservation:
              1,

            stockAfterReservation:
              0,

            pricingSnapshot: {
              test:
                "zarinpal-simulation",
            },
          },
        },
      },
    });

  const authority =
    `A${randomUUID()
      .replaceAll("-", "")}`;

  const attemptStatus =
    input.attemptStatus ??
    "REDIRECTED";

  const attempt =
    await prisma.paymentAttempt.create({
      data: {
        orderId:
          order.id,

        provider:
          "ZARINPAL",

        status:
          attemptStatus,

        amountToman:
          "100000",

        gatewayAuthority:
          authority,

        gatewayReference:
          attemptStatus ===
          "PAID"
            ? `9${suffix}`
            : null,

        activeKey:
          attemptStatus ===
          "REDIRECTED"
            ? `ZARINPAL:${order.id}`
            : null,

        redirectedAt:
          new Date(),

        verifiedAt:
          attemptStatus ===
          "PAID"
            ? new Date()
            : null,
      },
    });

  return {
    startedAt,
    collection,
    product,
    order,
    attempt,
    authority,
  };
}


async function cleanupFixture(
  fixture: Awaited<
    ReturnType<
      typeof createFixture
    >
  >,
) {
  /*
   * Order cascade removes:
   * payment attempts,
   * order items,
   * audit events,
   * notifications.
   */
  await prisma.order.deleteMany({
    where: {
      id:
        fixture.order.id,
    },
  });

  await prisma.product.deleteMany({
    where: {
      id:
        fixture.product.id,
    },
  });

  await prisma.collection.deleteMany({
    where: {
      id:
        fixture.collection.id,
    },
  });

  /*
   * Payment security telemetry is intentionally independent
   * of Order FK relations. Remove only events created during
   * this isolated fixture window and only known test types.
   *
   * SecurityAlert children cascade automatically.
   */
  await prisma.adminSecurityEvent.deleteMany({
    where: {
      createdAt: {
        gte:
          fixture.startedAt,
      },

      eventType: {
        in:
          testSecurityEventTypes,
      },
    },
  });
}


function mockVerifySuccess(
  input: {
    code:
      100 | 101;

    refId?:
      string | number;
  },
) {
  let calls =
    0;

  globalThis.fetch =
    async (
      request,
    ) => {
      calls +=
        1;

      const url =
        typeof request ===
        "string"
          ? request
          : request instanceof URL
            ? request.toString()
            : request.url;

      assert.match(
        url,
        /\/verify\.json$/,
      );

      const data:
        Record<
          string,
          unknown
        > = {
          code:
            input.code,

          message:
            input.code ===
            100
              ? "Paid"
              : "Already verified",

          fee:
            0,

          fee_type:
            "Merchant",
        };

      if (
        input.refId !==
        undefined
      ) {
        data.ref_id =
          input.refId;
      }

      return new Response(
        JSON.stringify({
          data,
        }),
        {
          status:
            200,

          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );
    };

  return {
    calls() {
      return calls;
    },
  };
}


function mockVerifyProviderFailure(
  code:
    number,
) {
  let calls =
    0;

  globalThis.fetch =
    async () => {
      calls +=
        1;

      return new Response(
        JSON.stringify({
          data: {
            code,
            message:
              "Provider verification rejected",
          },
        }),
        {
          status:
            200,

          headers: {
            "Content-Type":
              "application/json",
          },
        },
      );
    };

  return {
    calls() {
      return calls;
    },
  };
}


function mockTimeout() {
  let calls =
    0;

  globalThis.fetch =
    async () => {
      calls +=
        1;

      const error =
        new Error(
          "Simulated provider timeout",
        );

      error.name =
        "AbortError";

      throw error;
    };

  return {
    calls() {
      return calls;
    },
  };
}


function forbidProviderFetch() {
  let calls =
    0;

  globalThis.fetch =
    async () => {
      calls +=
        1;

      throw new Error(
        "Provider must not be called during replay/stale handling.",
      );
    };

  return {
    calls() {
      return calls;
    },
  };
}


async function auditExists(
  orderId:
    string,

  eventType:
    string,
) {
  return (
    await prisma.orderAuditEvent.count({
      where: {
        orderId,
        eventType,
      },
    })
  ) >
    0;
}


/*
 * ============================================================
 * CASE 1
 * Zarinpal verify code 100 = fresh successful payment.
 * Also verify an immediate callback replay does not re-contact
 * the provider or mutate the already-paid order.
 * ============================================================
 */

async function testSuccess100AndReplay() {
  const fixture =
    await createFixture();

  try {
    const provider =
      mockVerifySuccess({
        code:
          100,

        refId:
          "100000001",
      });

    const first =
      await verifyOrderPayment({
        orderId:
          fixture.order.id,

        authority:
          fixture.authority,

        gatewayStatus:
          "OK",
      });

    assert.equal(
      first.successful,
      true,
    );

    assert.equal(
      first.requiresReview,
      false,
    );

    assert.equal(
      first.referenceId,
      "100000001",
    );

    assert.equal(
      provider.calls(),
      1,
    );

    const [
      order,
      attempt,
    ] =
      await Promise.all([
        prisma.order.findUniqueOrThrow({
          where: {
            id:
              fixture.order.id,
          },
        }),

        prisma.paymentAttempt.findUniqueOrThrow({
          where: {
            id:
              fixture.attempt.id,
          },
        }),
      ]);

    assert.equal(
      order.status,
      "PAID",
    );

    assert.ok(
      order.paidAt,
    );

    assert.ok(
      order.inventoryCommittedAt,
    );

    assert.equal(
      order.inventoryReleasedAt,
      null,
    );

    assert.equal(
      attempt.status,
      "PAID",
    );

    assert.equal(
      attempt.gatewayReference,
      "100000001",
    );

    assert.equal(
      await auditExists(
        order.id,
        "PAYMENT_VERIFIED",
      ),
      true,
    );

    /*
     * Replayed OK callback after PAID must resolve from DB state.
     */
    const replayProvider =
      forbidProviderFetch();

    const replay =
      await verifyOrderPayment({
        orderId:
          fixture.order.id,

        authority:
          fixture.authority,

        gatewayStatus:
          "OK",
      });

    assert.equal(
      replay.successful,
      true,
    );

    assert.equal(
      replay.requiresReview,
      false,
    );

    assert.equal(
      replayProvider.calls(),
      0,
    );

    console.log(
      "PASS  Zarinpal 100 finalizes payment and replay is idempotent",
    );
  } finally {
    await cleanupFixture(
      fixture,
    );
  }
}


/*
 * ============================================================
 * CASE 2
 * Zarinpal 101 is accepted as already-verified success.
 * ============================================================
 */

async function testSuccess101() {
  const fixture =
    await createFixture();

  try {
    const provider =
      mockVerifySuccess({
        code:
          101,

        refId:
          "101000001",
      });

    const result =
      await verifyOrderPayment({
        orderId:
          fixture.order.id,

        authority:
          fixture.authority,

        gatewayStatus:
          "OK",
      });

    assert.equal(
      result.successful,
      true,
    );

    assert.equal(
      result.requiresReview,
      false,
    );

    assert.equal(
      provider.calls(),
      1,
    );

    const order =
      await prisma.order.findUniqueOrThrow({
        where: {
          id:
            fixture.order.id,
        },
      });

    const attempt =
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: {
          id:
            fixture.attempt.id,
        },
      });

    assert.equal(
      order.status,
      "PAID",
    );

    assert.equal(
      attempt.status,
      "PAID",
    );

    assert.equal(
      attempt.gatewayReference,
      "101000001",
    );

    console.log(
      "PASS  Zarinpal 101 is treated as successful verification",
    );
  } finally {
    await cleanupFixture(
      fixture,
    );
  }
}


/*
 * ============================================================
 * CASE 3
 * Customer/gateway cancellation callback.
 * Must never call verify endpoint.
 * ============================================================
 */

async function testCancelledCallback() {
  const fixture =
    await createFixture();

  try {
    const provider =
      forbidProviderFetch();

    const result =
      await verifyOrderPayment({
        orderId:
          fixture.order.id,

        authority:
          fixture.authority,

        gatewayStatus:
          "NOK",
      });

    assert.equal(
      provider.calls(),
      0,
    );

    assert.equal(
      result.successful,
      false,
    );

    const order =
      await prisma.order.findUniqueOrThrow({
        where: {
          id:
            fixture.order.id,
        },
      });

    const attempt =
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: {
          id:
            fixture.attempt.id,
        },
      });

    assert.equal(
      order.status,
      "PAYMENT_FAILED",
    );

    assert.equal(
      order.paidAt,
      null,
    );

    assert.equal(
      attempt.status,
      "CANCELLED",
    );

    assert.equal(
      attempt.activeKey,
      null,
    );

    assert.equal(
      await auditExists(
        order.id,
        "PAYMENT_CANCELLED",
      ),
      true,
    );

    console.log(
      "PASS  Cancelled callback fails safely without provider verification",
    );
  } finally {
    await cleanupFixture(
      fixture,
    );
  }
}


/*
 * ============================================================
 * CASE 4
 * Provider reports success but omits ref_id.
 *
 * This must NEVER become PAYMENT_FAILED.
 * Financial ambiguity => PAYMENT_REVIEW.
 * ============================================================
 */

async function testMissingReferenceRequiresReview() {
  const fixture =
    await createFixture();

  try {
    const provider =
      mockVerifySuccess({
        code:
          100,
      });

    const result =
      await verifyOrderPayment({
        orderId:
          fixture.order.id,

        authority:
          fixture.authority,

        gatewayStatus:
          "OK",
      });

    assert.equal(
      provider.calls(),
      1,
    );

    assert.equal(
      result.successful,
      true,
    );

    assert.equal(
      result.requiresReview,
      true,
    );

    assert.equal(
      result.referenceId,
      "",
    );

    const order =
      await prisma.order.findUniqueOrThrow({
        where: {
          id:
            fixture.order.id,
        },
      });

    const attempt =
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: {
          id:
            fixture.attempt.id,
        },
      });

    assert.equal(
      order.status,
      "PAYMENT_REVIEW",
    );

    assert.ok(
      order.paidAt,
    );

    assert.equal(
      order.inventoryCommittedAt,
      null,
    );

    assert.equal(
      attempt.status,
      "REQUIRES_REVIEW",
    );

    assert.equal(
      attempt.activeKey,
      null,
    );

    assert.equal(
      attempt.gatewayReference,
      null,
    );

    assert.equal(
      await auditExists(
        order.id,
        "PAYMENT_SUCCESS_WITHOUT_VALID_REFERENCE",
      ),
      true,
    );

    console.log(
      "PASS  Missing ref_id enters PAYMENT_REVIEW instead of false failure",
    );
  } finally {
    await cleanupFixture(
      fixture,
    );
  }
}


/*
 * ============================================================
 * CASE 5
 * Provider network timeout.
 *
 * Attempt must return to REDIRECTED and remain retryable.
 * Order/inventory must not be falsely marked failed/paid.
 * ============================================================
 */

async function testTimeoutRemainsRetryable() {
  const fixture =
    await createFixture();

  try {
    const provider =
      mockTimeout();

    await assert.rejects(
      () =>
        verifyOrderPayment({
          orderId:
            fixture.order.id,

          authority:
            fixture.authority,

          gatewayStatus:
            "OK",
        }),

      (
        error,
      ) =>
        error instanceof
          ZarinpalError,
    );

    assert.equal(
      provider.calls(),
      1,
    );

    const order =
      await prisma.order.findUniqueOrThrow({
        where: {
          id:
            fixture.order.id,
        },
      });

    const attempt =
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: {
          id:
            fixture.attempt.id,
        },
      });

    assert.equal(
      order.status,
      "PENDING_PAYMENT",
    );

    assert.equal(
      order.paidAt,
      null,
    );

    assert.equal(
      order.inventoryReleasedAt,
      null,
    );

    assert.equal(
      attempt.status,
      "REDIRECTED",
    );

    assert.equal(
      attempt.verificationLeaseExpiresAt,
      null,
    );

    assert.equal(
      await auditExists(
        order.id,
        "PAYMENT_VERIFICATION_RETRY_REQUIRED",
      ),
      true,
    );

    console.log(
      "PASS  Provider timeout remains retryable and preserves reservation",
    );
  } finally {
    await cleanupFixture(
      fixture,
    );
  }
}


/*
 * ============================================================
 * CASE 6
 * Zarinpal verify returns a non-success provider code.
 *
 * Do not irreversibly fail the order because a later callback /
 * reconciliation attempt may still resolve the payment.
 * ============================================================
 */

async function testProviderVerifyFailureRemainsRetryable() {
  const fixture =
    await createFixture();

  try {
    const provider =
      mockVerifyProviderFailure(
        -51,
      );

    await assert.rejects(
      () =>
        verifyOrderPayment({
          orderId:
            fixture.order.id,

          authority:
            fixture.authority,

          gatewayStatus:
            "OK",
        }),

      (
        error,
      ) =>
        error instanceof
          ZarinpalError &&
        error.code ===
          -51,
    );

    assert.equal(
      provider.calls(),
      1,
    );

    const order =
      await prisma.order.findUniqueOrThrow({
        where: {
          id:
            fixture.order.id,
        },
      });

    const attempt =
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: {
          id:
            fixture.attempt.id,
        },
      });

    assert.equal(
      order.status,
      "PENDING_PAYMENT",
    );

    assert.equal(
      attempt.status,
      "REDIRECTED",
    );

    assert.equal(
      attempt.verificationLeaseExpiresAt,
      null,
    );

    assert.equal(
      await auditExists(
        order.id,
        "PAYMENT_VERIFICATION_RETRY_REQUIRED",
      ),
      true,
    );

    console.log(
      "PASS  Provider verify failure stays retryable",
    );
  } finally {
    await cleanupFixture(
      fixture,
    );
  }
}


/*
 * ============================================================
 * CASE 7
 * Stale NOK callback targeting an already-paid order through
 * another still-redirected authority.
 *
 * Must never downgrade PAID.
 * ============================================================
 */

async function testStaleCallbackCannotDowngradePaidOrder() {
  const fixture =
    await createFixture({
      orderStatus:
        "PAID",

      attemptStatus:
        "REDIRECTED",
    });

  try {
    const provider =
      forbidProviderFetch();

    const result =
      await verifyOrderPayment({
        orderId:
          fixture.order.id,

        authority:
          fixture.authority,

        gatewayStatus:
          "NOK",
      });

    assert.equal(
      provider.calls(),
      0,
    );

    assert.equal(
      result.successful,
      false,
    );

    const order =
      await prisma.order.findUniqueOrThrow({
        where: {
          id:
            fixture.order.id,
        },
      });

    const attempt =
      await prisma.paymentAttempt.findUniqueOrThrow({
        where: {
          id:
            fixture.attempt.id,
        },
      });

    assert.equal(
      order.status,
      "PAID",
    );

    assert.ok(
      order.paidAt,
    );

    assert.ok(
      order.inventoryCommittedAt,
    );

    assert.equal(
      attempt.status,
      "REDIRECTED",
    );

    assert.equal(
      await auditExists(
        order.id,
        "STALE_PAYMENT_CALLBACK_IGNORED",
      ),
      true,
    );

    console.log(
      "PASS  Stale callback cannot downgrade an already-paid order",
    );
  } finally {
    await cleanupFixture(
      fixture,
    );
  }
}


async function main() {
  await testSuccess100AndReplay();

  await testSuccess101();

  await testCancelledCallback();

  await testMissingReferenceRequiresReview();

  await testTimeoutRemainsRetryable();

  await testProviderVerifyFailureRemainsRetryable();

  await testStaleCallbackCannotDowngradePaidOrder();

  console.log("");
  console.log(
    "PASS  All ELORIA Zarinpal provider simulations completed",
  );
}


main()
  .catch(
    error => {
      console.error(
        error,
      );

      process.exitCode =
        1;
    },
  )
  .finally(
    async () => {
      globalThis.fetch =
        originalFetch;

      await prisma.$disconnect();

      await databasePool.end();
    },
  );
