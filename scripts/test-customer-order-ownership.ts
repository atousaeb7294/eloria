import "dotenv/config";
import {
  randomBytes,
} from "node:crypto";

process.env.ELORIA_CUSTOMER_AUTH_SECRET =
  process.env.ELORIA_CUSTOMER_AUTH_SECRET ||
  "hardening-customer-auth-secret-hardening-customer-auth-secret";
process.env.ELORIA_CUSTOMER_OTP_DEV_CODE =
  "654321";

async function main(): Promise<void> {
const {
  createCustomerOtpChallenge,
  consumeCustomerOtp,
} = await import(
  "../src/lib/customer-auth"
);
const {
  databasePool,
  prisma,
} = await import(
  "../src/lib/prisma"
);

function expect(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

const suffix =
  randomBytes(3)
    .toString("hex")
    .toUpperCase();

const numericSuffix =
  String(
    Number.parseInt(
      randomBytes(3).toString(
        "hex",
      ),
      16,
    ) % 10_000_000,
  ).padStart(7, "0");

const mobile =
  `0912${numericSuffix}`;

const orderNumber =
  `PRIV${suffix}`;

const idempotencyKey =
  `privacy-test-${suffix}-1234567890`;

const now =
  new Date();
const later =
  new Date(
    now.getTime() +
      30 * 60_000,
  );

let orderId:
  string | null = null;
let customerId:
  string | null = null;

try {
  const order =
    await prisma.order.create({
      data: {
        orderNumber,
        idempotencyKey,
        locale: "fa",
        customerFullName:
          "Guest Privacy Test",
        customerMobile:
          mobile,
        subtotalToman: "0",
        shippingToman: "0",
        discountToman: "0",
        payableToman: "0",
        pricingSnapshot: {},
        priceVerifiedAt:
          now,
        priceExpiresAt:
          later,
        inventoryReservedAt:
          now,
        inventoryExpiresAt:
          later,
      },
    });

  orderId = order.id;

  const challenge =
    await createCustomerOtpChallenge({
      mobile,
      ip: "127.0.0.1",
    });

  const customer =
    await consumeCustomerOtp({
      challengeId:
        challenge.id,
      mobile,
      code: "654321",
    });

  customerId =
    customer.id;

  const unchanged =
    await prisma.order.findUnique({
      where: {
        id: order.id,
      },
      select: {
        customerId:
          true,
      },
    });

  expect(
    unchanged?.customerId ===
      null,
    "OTP login must not auto-claim historical guest orders by phone number alone.",
  );

  console.log(
    "PASS  Historical guest order remains unclaimed after OTP login",
  );
} finally {
  if (orderId) {
    await prisma.order.deleteMany({
      where: {
        id: orderId,
      },
    });
  }

  if (customerId) {
    await prisma.customer.deleteMany({
      where: {
        id: customerId,
      },
    });
  }

  await prisma.customerOtpChallenge.deleteMany({
    where: {
      mobile,
    },
  });

  await prisma.$disconnect();
  await databasePool.end();
}
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
