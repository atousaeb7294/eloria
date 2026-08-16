import {
  createPaymentStartAuthorization,
  verifyPaymentStartAuthorization,
} from "../src/lib/payment-start-authorization";
import {
  productionEnvironmentChecks,
} from "../src/lib/env-validation";

function expect(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

process.env.ELORIA_PAYMENT_START_SECRET =
  "hardening-payment-start-secret-hardening-payment-start-secret-123";

const token =
  createPaymentStartAuthorization({
    orderId:
      "11111111-1111-1111-1111-111111111111",
    amountToman:
      "1250000",
    mobile:
      "09121234567",
  });

expect(
  verifyPaymentStartAuthorization(
    token,
    {
      orderId:
        "11111111-1111-1111-1111-111111111111",
      amountToman:
        "1250000",
      mobile:
        "09121234567",
    },
  ),
  "Valid payment-start authorization must verify.",
);

expect(
  !verifyPaymentStartAuthorization(
    token,
    {
      orderId:
        "11111111-1111-1111-1111-111111111111",
      amountToman:
        "1250001",
      mobile:
        "09121234567",
    },
  ),
  "Payment-start authorization must be bound to amount.",
);

expect(
  !verifyPaymentStartAuthorization(
    token,
    {
      orderId:
        "11111111-1111-1111-1111-111111111111",
      amountToman:
        "1250000",
      mobile:
        "09120000000",
    },
  ),
  "Payment-start authorization must be bound to mobile.",
);

const snapshot =
  { ...process.env };

try {
  process.env.ELORIA_COMMERCE_ENABLED =
    "true";
  process.env.ELORIA_CUSTOMER_AUTH_ENABLED =
    "true";
  process.env.ELORIA_DYNAMIC_PRICING_ENABLED =
    "false";
  process.env.ELORIA_PAYMENT_ENABLED =
    "false";

  delete process.env
    .TURNSTILE_SECRET_KEY;
  delete process.env
    .NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete process.env
    .KAVENEGAR_API_KEY;

  const checks =
    productionEnvironmentChecks();

  const turnstileSecret =
    checks.find(
      check =>
        check.key ===
        "TURNSTILE_SECRET_KEY",
    );

  const turnstileSite =
    checks.find(
      check =>
        check.key ===
        "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    );

  const sms =
    checks.find(
      check =>
        check.key ===
        "KAVENEGAR_API_KEY",
    );

  expect(
    Boolean(
      turnstileSecret
        ?.required &&
        !turnstileSecret.valid,
    ),
    "Commerce/Auth enabled must require Turnstile secret.",
  );

  expect(
    Boolean(
      turnstileSite
        ?.required &&
        !turnstileSite.valid,
    ),
    "Commerce/Auth enabled must require Turnstile site key.",
  );

  expect(
    Boolean(
      sms?.required &&
        !sms.valid,
    ),
    "Customer Auth enabled must require SMS provider.",
  );
} finally {
  for (
    const key of Object.keys(
      process.env,
    )
  ) {
    if (
      !(key in snapshot)
    ) {
      delete process.env[key];
    }
  }

  Object.assign(
    process.env,
    snapshot,
  );
}

console.log(
  "PASS  Hardening feature and payment authorization contracts",
);
