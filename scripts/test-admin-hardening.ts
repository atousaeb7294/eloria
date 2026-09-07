import assert from "node:assert/strict";
import {
  createHmac,
  randomUUID,
} from "node:crypto";
import {
  readFileSync,
} from "node:fs";

import {
  isAdminConfigured,
  isAdminTotpRequired,
  verifyAdminCredentials,
} from "../src/lib/admin-auth";

import {
  syncProductInventory,
} from "../src/lib/inventory";

import {
  markReviewedPaymentRefunded,
  OrderOperationError,
  saveShipmentDetails,
  transitionOrderByAdmin,
} from "../src/lib/order-operations";

import {
  databasePool,
  prisma,
} from "../src/lib/prisma";


const TEST_TOTP_SECRET =
  "JBSWY3DPEHPK3PXP";

const TEST_ADMIN_USERNAME =
  "admin-hardening";

const TEST_ADMIN_PASSWORD =
  "Admin-Hardening-Password-1234567890!";

const TEST_SESSION_SECRET =
  "admin-hardening-session-secret-0123456789-ABCDEFGHIJKLMNOPQRSTUVWXYZ";


function decodeBase32(
  value: string,
): Buffer {
  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

  let bits =
    "";

  for (
    const character of
    value
      .replace(/=+$/, "")
      .toUpperCase()
  ) {
    const index =
      alphabet.indexOf(
        character,
      );

    if (
      index <
      0
    ) {
      throw new Error(
        "Invalid base32 test secret.",
      );
    }

    bits +=
      index
        .toString(2)
        .padStart(
          5,
          "0",
        );
  }

  const bytes:
    number[] =
    [];

  for (
    let offset = 0;
    offset + 8 <=
      bits.length;
    offset +=
      8
  ) {
    bytes.push(
      Number.parseInt(
        bits.slice(
          offset,
          offset + 8,
        ),
        2,
      ),
    );
  }

  return Buffer.from(
    bytes,
  );
}


function totpAt(
  secret: string,
  counter: number,
): string {
  const buffer =
    Buffer.alloc(
      8,
    );

  buffer.writeBigUInt64BE(
    BigInt(
      counter,
    ),
  );

  const digest =
    createHmac(
      "sha1",
      decodeBase32(
        secret,
      ),
    )
      .update(
        buffer,
      )
      .digest();

  const offset =
    digest[
      digest.length -
      1
    ]! &
    0x0f;

  const code =
    (
      (
        (
          digest[offset]! &
          0x7f
        ) <<
        24
      ) |
      (
        (
          digest[
            offset + 1
          ]! &
          0xff
        ) <<
        16
      ) |
      (
        (
          digest[
            offset + 2
          ]! &
          0xff
        ) <<
        8
      ) |
      (
        digest[
          offset + 3
        ]! &
        0xff
      )
    ) %
    1_000_000;

  return code
    .toString()
    .padStart(
      6,
      "0",
    );
}


async function testAdminAuthenticationContract() {
  const keys = [
    "NODE_ENV",
    "ELORIA_ADMIN_USERNAME",
    "ELORIA_ADMIN_PASSWORD",
    "ELORIA_ADMIN_SESSION_SECRET",
    "ELORIA_ADMIN_SESSION_VERSION",
    "ELORIA_ADMIN_TOTP_SECRET",
  ] as const;

  const backup =
    new Map(
      keys.map(
        key => [
          key,
          process.env[key],
        ],
      ),
    );

  const originalDateNow =
    Date.now;

  const mutableEnv =
    process.env as unknown as
      Record<string, string | undefined>;

  try {
    mutableEnv["NODE_ENV"] =
      "production";

    mutableEnv["ELORIA_ADMIN_USERNAME"] =
      TEST_ADMIN_USERNAME;

    mutableEnv["ELORIA_ADMIN_PASSWORD"] =
      TEST_ADMIN_PASSWORD;

    mutableEnv["ELORIA_ADMIN_SESSION_SECRET"] =
      TEST_SESSION_SECRET;

    mutableEnv["ELORIA_ADMIN_SESSION_VERSION"] =
      "admin-hardening-v1";

    mutableEnv["ELORIA_ADMIN_TOTP_SECRET"] =
      TEST_TOTP_SECRET;

    assert.equal(
      isAdminTotpRequired(),
      true,
    );

    assert.equal(
      isAdminConfigured(),
      true,
    );

    const fixedTime =
      1_800_000_000_000;

    Date.now =
      () =>
        fixedTime;

    const currentCounter =
      Math.floor(
        fixedTime /
        30_000,
      );

    const currentCode =
      totpAt(
        TEST_TOTP_SECRET,
        currentCounter,
      );

    assert.equal(
      verifyAdminCredentials({
        username:
          TEST_ADMIN_USERNAME,
        password:
          TEST_ADMIN_PASSWORD,
        totpCode:
          currentCode,
      }),
      true,
    );

    assert.equal(
      verifyAdminCredentials({
        username:
          TEST_ADMIN_USERNAME,
        password:
          TEST_ADMIN_PASSWORD,
        totpCode:
          totpAt(
            TEST_TOTP_SECRET,
            currentCounter -
              1,
          ),
      }),
      true,
    );

    assert.equal(
      verifyAdminCredentials({
        username:
          TEST_ADMIN_USERNAME,
        password:
          TEST_ADMIN_PASSWORD,
        totpCode:
          totpAt(
            TEST_TOTP_SECRET,
            currentCounter +
              1,
          ),
      }),
      true,
    );

    assert.equal(
      verifyAdminCredentials({
        username:
          TEST_ADMIN_USERNAME,
        password:
          TEST_ADMIN_PASSWORD,
        totpCode:
          totpAt(
            TEST_TOTP_SECRET,
            currentCounter +
              2,
          ),
      }),
      false,
    );

    assert.equal(
      verifyAdminCredentials({
        username:
          "wrong-admin",
        password:
          TEST_ADMIN_PASSWORD,
        totpCode:
          currentCode,
      }),
      false,
    );

    assert.equal(
      verifyAdminCredentials({
        username:
          TEST_ADMIN_USERNAME,
        password:
          "wrong-password",
        totpCode:
          currentCode,
      }),
      false,
    );

    assert.equal(
      verifyAdminCredentials({
        username:
          TEST_ADMIN_USERNAME,
        password:
          TEST_ADMIN_PASSWORD,
        totpCode:
          "00000",
      }),
      false,
    );

    mutableEnv["ELORIA_ADMIN_PASSWORD"] =
      "short-production";

    assert.equal(
      isAdminConfigured(),
      false,
    );

    mutableEnv["ELORIA_ADMIN_PASSWORD"] =
      TEST_ADMIN_PASSWORD;

    mutableEnv["ELORIA_ADMIN_SESSION_SECRET"] =
      "short-secret";

    assert.equal(
      isAdminConfigured(),
      false,
    );

    mutableEnv["ELORIA_ADMIN_SESSION_SECRET"] =
      TEST_SESSION_SECRET;

    mutableEnv["ELORIA_ADMIN_TOTP_SECRET"] =
      "INVALID-TOTP-SECRET!";

    assert.equal(
      isAdminConfigured(),
      false,
    );

    console.log(
      "PASS  Admin production TOTP and credential contract",
    );
  } finally {
    Date.now =
      originalDateNow;

    for (
      const key of
      keys
    ) {
      const value =
        backup.get(
          key,
        );

      if (
        value ===
        undefined
      ) {
        delete mutableEnv[
          key
        ];
      } else {
        mutableEnv[
          key
        ] =
          value;
      }
    }
  }
}


function testAdminSourceSecurityContracts() {
  const adminAuth =
    readFileSync(
      "src/lib/admin-auth.ts",
      "utf8",
    );

  const loginAction =
    readFileSync(
      "src/app/[locale]/admin/login/actions.ts",
      "utf8",
    );

  const productAssets =
    readFileSync(
      "src/app/[locale]/admin/(protected)/products/assets/actions.ts",
      "utf8",
    );

  const orderActions =
    readFileSync(
      "src/app/[locale]/admin/(protected)/orders/actions.ts",
      "utf8",
    );

  const orderOperations =
    readFileSync(
      "src/lib/order-operations.ts",
      "utf8",
    );

  assert.ok(
    adminAuth.includes(
      "__Host-eloria_admin_session",
    ),
  );

  assert.match(
    adminAuth,
    /sameSite:\s*"strict"/,
  );

  assert.match(
    adminAuth,
    /httpOnly:\s*true/,
  );

  assert.match(
    adminAuth,
    /secure:\s*process\.env\.NODE_ENV\s*===\s*"production"/,
  );

  assert.match(
    adminAuth,
    /SESSION_LIFETIME_SECONDS\s*=\s*8\s*\*\s*60\s*\*\s*60/,
  );

  assert.ok(
    adminAuth.includes(
      "revokedAt: null",
    ),
  );

  assert.ok(
    loginAction.includes(
      "admin-login-ip:",
    ),
  );

  assert.ok(
    loginAction.includes(
      "admin-login:",
    ),
  );

  assert.match(
    loginAction,
    /limit:\s*12/,
  );

  assert.match(
    loginAction,
    /limit:\s*5/,
  );

  assert.match(
    loginAction,
    /15\s*\*\s*60_000/,
  );

  assert.ok(
    loginAction.includes(
      "LOGIN_RATE_LIMITED",
    ),
  );

  assert.match(
    loginAction,
    /setTimeout\(resolve,\s*750\)/,
  );

  assert.ok(
    productAssets.includes(
      "orderItem.count",
    ),
  );

  assert.ok(
    productAssets.includes(
      "isActive: false",
    ),
  );

  assert.ok(
    productAssets.includes(
      'status: "ARCHIVED"',
    ),
  );

  assert.ok(
    productAssets.includes(
      "syncProductInventory",
    ),
  );

  const protectedOrderActions =
    orderActions.match(
      /await session\(\);/g,
    ) ??
    [];

  assert.ok(
    protectedOrderActions.length >=
      3,
  );

  assert.ok(
    orderOperations.includes(
      'target === "REFUNDED"',
    ),
  );

  assert.ok(
    orderOperations.includes(
      "normalizeRefundReference",
    ),
  );

  assert.ok(
    orderOperations.includes(
      "PAYMENT_ATTEMPT_MANUALLY_REFUNDED",
    ),
  );

  assert.ok(
    orderOperations.includes(
      "SHIPMENT_DETAILS_UPDATED",
    ),
  );

  console.log(
    "PASS  Admin session rate-limit archive refund and shipment source contracts",
  );
}


async function createAdminCommerceFixture() {
  const suffix =
    randomUUID()
      .replaceAll(
        "-",
        "",
      )
      .slice(
        0,
        10,
      );

  const collection =
    await prisma.collection.create({
      data: {
        slug:
          `admin-hardening-${suffix}`,
        nameFa:
          "تست مدیریت",
        nameEn:
          "Admin Hardening",
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
          `admin-product-${suffix}`,
        nameFa:
          "محصول تست مدیریت",
        nameEn:
          "Admin test product",
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

  const variantA =
    await prisma.productVariant.create({
      data: {
        productId:
          product.id,
        titleFa:
          "تنوع اول",
        titleEn:
          "Variant A",
        sku:
          `ADMIN-A-${suffix}`,
        stock:
          2,
        isActive:
          true,
      },
    });

  const variantB =
    await prisma.productVariant.create({
      data: {
        productId:
          product.id,
        titleFa:
          "تنوع دوم",
        titleEn:
          "Variant B",
        sku:
          `ADMIN-B-${suffix}`,
        stock:
          3,
        isActive:
          true,
      },
    });

  const refundProduct =
    await prisma.product.create({
      data: {
        collectionId:
          collection.id,
        slug:
          `admin-refund-product-${suffix}`,
        nameFa:
          "محصول بازپرداخت",
        nameEn:
          "Admin refund product",
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

  return {
    suffix,
    collection,
    product,
    variantA,
    variantB,
    refundProduct,
  };
}


async function cleanupAdminCommerceFixture(
  fixture:
    Awaited<
      ReturnType<
        typeof createAdminCommerceFixture
      >
    >,
  orderIds:
    string[],
) {
  if (
    orderIds.length
  ) {
    await prisma.order.deleteMany({
      where: {
        id: {
          in:
            orderIds,
        },
      },
    });
  }

  await prisma.product.deleteMany({
    where: {
      id: {
        in: [
          fixture.product.id,
          fixture.refundProduct.id,
        ],
      },
    },
  });

  await prisma.collection.deleteMany({
    where: {
      id:
        fixture.collection.id,
    },
  });
}


async function testVariantInventoryLifecycle(
  fixture:
    Awaited<
      ReturnType<
        typeof createAdminCommerceFixture
      >
    >,
) {
  const first =
    await prisma.$transaction(
      transaction =>
        syncProductInventory(
          transaction,
          fixture.product.id,
        ),
    );

  assert.equal(
    first.stock,
    5,
  );

  assert.equal(
    first.status,
    "ACTIVE",
  );

  let product =
    await prisma.product.findUniqueOrThrow({
      where: {
        id:
          fixture.product.id,
      },
    });

  assert.equal(
    product.stock,
    5,
  );

  assert.equal(
    product.status,
    "ACTIVE",
  );

  await prisma.productVariant.update({
    where: {
      id:
        fixture.variantA.id,
    },
    data: {
      isActive:
        false,
    },
  });

  await prisma.productVariant.update({
    where: {
      id:
        fixture.variantB.id,
    },
    data: {
      stock:
        0,
    },
  });

  const empty =
    await prisma.$transaction(
      transaction =>
        syncProductInventory(
          transaction,
          fixture.product.id,
        ),
    );

  assert.equal(
    empty.stock,
    0,
  );

  assert.equal(
    empty.status,
    "OUT_OF_STOCK",
  );

  await prisma.productVariant.update({
    where: {
      id:
        fixture.variantA.id,
    },
    data: {
      isActive:
        true,
      stock:
        4,
    },
  });

  await prisma.productVariant.update({
    where: {
      id:
        fixture.variantB.id,
    },
    data: {
      stock:
        1,
    },
  });

  const restored =
    await prisma.$transaction(
      transaction =>
        syncProductInventory(
          transaction,
          fixture.product.id,
        ),
    );

  assert.equal(
    restored.stock,
    5,
  );

  assert.equal(
    restored.status,
    "ACTIVE",
  );

  product =
    await prisma.product.findUniqueOrThrow({
      where: {
        id:
          fixture.product.id,
      },
    });

  assert.equal(
    product.stock,
    5,
  );

  console.log(
    "PASS  Variant inventory lifecycle synchronizes parent product safely",
  );
}


async function createPaidWorkflowOrder(
  fixture:
    Awaited<
      ReturnType<
        typeof createAdminCommerceFixture
      >
    >,
) {
  const now =
    new Date();

  return prisma.order.create({
    data: {
      orderNumber:
        `ADM-${fixture.suffix}`
          .toUpperCase(),

      idempotencyKey:
        `admin-hardening:${randomUUID()}`,

      locale:
        "fa",

      status:
        "PAID",

      customerFullName:
        "Admin Workflow Test",

      customerMobile:
        `0901${fixture.suffix
          .replace(/\D/g, "")
          .padEnd(
            7,
            "0",
          )
          .slice(
            0,
            7,
          )}`,

      subtotalToman:
        "100000",

      payableToman:
        "100000",

      pricingSnapshot: {
        test:
          "admin-hardening",
      },

      priceVerifiedAt:
        new Date(
          now.getTime() -
            60_000,
        ),

      priceExpiresAt:
        new Date(
          now.getTime() +
            15 *
              60_000,
        ),

      inventoryReservedAt:
        new Date(
          now.getTime() -
            60_000,
        ),

      inventoryExpiresAt:
        new Date(
          now.getTime() +
            15 *
              60_000,
        ),

      paidAt:
        now,

      inventoryCommittedAt:
        now,

      items: {
        create: {
          productId:
            fixture.product.id,

          productSlug:
            fixture.product.slug,

          productNameFa:
            fixture.product.nameFa,

          productNameEn:
            fixture.product.nameEn,

          material:
            "GOLD",

          quantity:
            1,

          unitPriceToman:
            "100000",

          lineTotalToman:
            "100000",

          stockBeforeReservation:
            6,

          stockAfterReservation:
            5,

          pricingSnapshot: {
            test:
              "admin-hardening",
          },
        },
      },
    },
  });
}


async function testOrderShipmentWorkflow(
  fixture:
    Awaited<
      ReturnType<
        typeof createAdminCommerceFixture
      >
    >,
  orderIds:
    string[],
) {
  const order =
    await createPaidWorkflowOrder(
      fixture,
    );

  orderIds.push(
    order.id,
  );

  const processing =
    await transitionOrderByAdmin({
      orderId:
        order.id,
      target:
        "PROCESSING",
      note:
        "Admin hardening processing",
    });

  assert.equal(
    processing.from,
    "PAID",
  );

  assert.equal(
    processing.to,
    "PROCESSING",
  );

  await saveShipmentDetails({
    orderId:
      order.id,
    carrier:
      "ELORIA-TEST-CARRIER",
    trackingCode:
      `TRACK-${fixture.suffix}`,
    note:
      "Created before shipped state",
  });

  let shipment =
    await prisma.shipment.findFirstOrThrow({
      where: {
        orderId:
          order.id,
      },
    });

  assert.equal(
    shipment.status,
    "PROCESSING",
  );

  assert.equal(
    shipment.shippedAt,
    null,
  );

  await transitionOrderByAdmin({
    orderId:
      order.id,
    target:
      "SHIPPED",
    note:
      "Admin hardening shipped",
  });

  await saveShipmentDetails({
    orderId:
      order.id,
    carrier:
      "ELORIA-TEST-CARRIER",
    trackingCode:
      `TRACK-${fixture.suffix}`,
    note:
      "Updated after shipped state",
  });

  const shipmentCount =
    await prisma.shipment.count({
      where: {
        orderId:
          order.id,
      },
    });

  assert.equal(
    shipmentCount,
    1,
  );

  shipment =
    await prisma.shipment.findFirstOrThrow({
      where: {
        orderId:
          order.id,
      },
    });

  assert.equal(
    shipment.status,
    "SHIPPED",
  );

  assert.ok(
    shipment.shippedAt,
  );

  await transitionOrderByAdmin({
    orderId:
      order.id,
    target:
      "COMPLETED",
    note:
      "Admin hardening completed",
  });

  const completed =
    await prisma.order.findUniqueOrThrow({
      where: {
        id:
          order.id,
      },
    });

  assert.equal(
    completed.status,
    "COMPLETED",
  );

  await assert.rejects(
    () =>
      transitionOrderByAdmin({
        orderId:
          order.id,
        target:
          "PROCESSING",
        note:
          null,
      }),
    (
      error: unknown,
    ) =>
      error instanceof
        OrderOperationError,
  );

  await assert.rejects(
    () =>
      transitionOrderByAdmin({
        orderId:
          order.id,
        target:
          "REFUNDED",
        note:
          null,
      }),
    (
      error: unknown,
    ) =>
      error instanceof
        OrderOperationError,
  );

  const workflowAuditCount =
    await prisma.orderAuditEvent.count({
      where: {
        orderId:
          order.id,
        eventType:
          "ADMIN_STATUS_CHANGED",
      },
    });

  assert.equal(
    workflowAuditCount,
    3,
  );

  console.log(
    "PASS  Admin order processing shipment completion and invalid-transition guards",
  );
}


async function createRefundReviewOrder(
  fixture:
    Awaited<
      ReturnType<
        typeof createAdminCommerceFixture
      >
    >,
) {
  const now =
    new Date();

  const order =
    await prisma.order.create({
      data: {
        orderNumber:
          `RFD-${fixture.suffix}`
            .toUpperCase(),

        idempotencyKey:
          `admin-refund:${randomUUID()}`,

        locale:
          "fa",

        status:
          "PAYMENT_REVIEW",

        customerFullName:
          "Admin Refund Test",

        customerMobile:
          `0902${fixture.suffix
            .replace(/\D/g, "")
            .padEnd(
              7,
              "1",
            )
            .slice(
              0,
              7,
            )}`,

        subtotalToman:
          "100000",

        payableToman:
          "100000",

        pricingSnapshot: {
          test:
            "admin-refund",
        },

        priceVerifiedAt:
          new Date(
            now.getTime() -
              60_000,
          ),

        priceExpiresAt:
          new Date(
            now.getTime() +
              15 *
                60_000,
          ),

        inventoryReservedAt:
          new Date(
            now.getTime() -
              60_000,
          ),

        inventoryExpiresAt:
          new Date(
            now.getTime() +
              15 *
                60_000,
          ),

        paidAt:
          now,

        items: {
          create: {
            productId:
              fixture.refundProduct.id,

            productSlug:
              fixture.refundProduct.slug,

            productNameFa:
              fixture.refundProduct.nameFa,

            productNameEn:
              fixture.refundProduct.nameEn,

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
                "admin-refund",
            },
          },
        },
      },
    });

  const attempt =
    await prisma.paymentAttempt.create({
      data: {
        orderId:
          order.id,

        provider:
          "ZARINPAL",

        status:
          "REQUIRES_REVIEW",

        amountToman:
          "100000",

        gatewayAuthority:
          `A${randomUUID()
            .replaceAll(
              "-",
              "",
            )}`,

        verifiedAt:
          now,

        errorMessage:
          "Admin hardening review fixture",
      },
    });

  return {
    order,
    attempt,
  };
}


async function testRefundWorkflow(
  fixture:
    Awaited<
      ReturnType<
        typeof createAdminCommerceFixture
      >
    >,
  orderIds:
    string[],
) {
  const {
    order,
    attempt,
  } =
    await createRefundReviewOrder(
      fixture,
    );

  orderIds.push(
    order.id,
  );

  const refundReference =
    `ADMIN-REFUND-${fixture.suffix}`;

  const first =
    await markReviewedPaymentRefunded({
      orderId:
        order.id,
      paymentAttemptId:
        attempt.id,
      refundReference,
      note:
        "Admin hardening refund",
    });

  assert.equal(
    first.paymentAttemptId,
    attempt.id,
  );

  assert.equal(
    first.orderRefunded,
    true,
  );

  const [
    refundedOrder,
    refundedAttempt,
    restoredProduct,
  ] =
    await Promise.all([
      prisma.order.findUniqueOrThrow({
        where: {
          id:
            order.id,
        },
      }),

      prisma.paymentAttempt.findUniqueOrThrow({
        where: {
          id:
            attempt.id,
        },
      }),

      prisma.product.findUniqueOrThrow({
        where: {
          id:
            fixture.refundProduct.id,
        },
      }),
    ]);

  assert.equal(
    refundedOrder.status,
    "REFUNDED",
  );

  assert.ok(
    refundedOrder.refundedAt,
  );

  assert.ok(
    refundedOrder.inventoryReleasedAt,
  );

  assert.equal(
    refundedAttempt.status,
    "REFUNDED",
  );

  assert.equal(
    refundedAttempt.refundReference,
    refundReference,
  );

  assert.equal(
    restoredProduct.stock,
    1,
  );

  assert.equal(
    restoredProduct.status,
    "ACTIVE",
  );

  const second =
    await markReviewedPaymentRefunded({
      orderId:
        order.id,
      paymentAttemptId:
        attempt.id,
      refundReference,
      note:
        "Idempotent replay",
    });

  assert.equal(
    second.orderRefunded,
    true,
  );

  await assert.rejects(
    () =>
      markReviewedPaymentRefunded({
        orderId:
          order.id,
        paymentAttemptId:
          attempt.id,
        refundReference:
          `DIFFERENT-${fixture.suffix}`,
        note:
          null,
      }),
    (
      error: unknown,
    ) =>
      error instanceof
        OrderOperationError,
  );

  const refundAuditCount =
    await prisma.orderAuditEvent.count({
      where: {
        orderId:
          order.id,
        eventType:
          "PAYMENT_ATTEMPT_MANUALLY_REFUNDED",
      },
    });

  assert.equal(
    refundAuditCount,
    1,
  );

  console.log(
    "PASS  Admin refund requires durable reference restores reserved inventory and is idempotent",
  );
}


async function testAdminCommerceRuntime() {
  const fixture =
    await createAdminCommerceFixture();

  const orderIds:
    string[] =
    [];

  try {
    await testVariantInventoryLifecycle(
      fixture,
    );

    await testOrderShipmentWorkflow(
      fixture,
      orderIds,
    );

    await testRefundWorkflow(
      fixture,
      orderIds,
    );

    console.log(
      "PASS  Admin commerce runtime hardening",
    );
  } finally {
    await cleanupAdminCommerceFixture(
      fixture,
      orderIds,
    );
  }
}


async function main() {
  await testAdminAuthenticationContract();

  testAdminSourceSecurityContracts();

  await testAdminCommerceRuntime();

  console.log("");
  console.log(
    "PASS  All ELORIA admin hardening tests completed",
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
      await prisma.$disconnect();

      await databasePool.end();
    },
  );
