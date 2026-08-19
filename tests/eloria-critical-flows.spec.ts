import {
  appendFileSync,
} from "node:fs";

import {
  tmpdir,
} from "node:os";

import {
  join,
} from "node:path";

import {
  randomUUID,
} from "node:crypto";

import {
  expect,
  request as playwrightRequest,
  test,
} from "@playwright/test";

const BASE_URL =
  "http:" +
  "//127.0.0.1:3100";

const ATTACKER_ORIGIN =
  "https:" +
  "//attacker.invalid";

const E2E_PRODUCT_SLUG =
  "mehr-necklace";

const TRACK_FILE =
  join(
    tmpdir(),
    "eloria-e2e-runtime.jsonl",
  );

function track(
  type:
    | "mobile"
    | "order",
  value: string,
): void {
  appendFileSync(
    TRACK_FILE,
    `${JSON.stringify({
      type,
      value,
    })}\n`,
    "utf8",
  );
}

function trustedHeaders() {
  return {
    Origin:
      BASE_URL,
  };
}

function createTestMobile(): string {
  const suffix =
    Math.floor(
      Math.random() *
        1_000_000_000,
    )
      .toString()
      .padStart(
        9,
        "0",
      );

  return `09${suffix}`;
}

test.describe(
  "ELORIA critical API flows",
  () => {
    test.beforeEach(
      async (
        {},
        testInfo,
      ) => {
        test.skip(
          testInfo.project.name !==
            "chromium-desktop",

          "Stateful API contracts run once.",
        );
      },
    );

    test(
      "security-sensitive POST APIs reject untrusted origins",
      async ({
        request,
      }) => {
        const malicious = {
          Origin:
            ATTACKER_ORIGIN,
        };

        const otp =
          await request.post(
            "/api/customer/auth/request-otp",
            {
              headers:
                malicious,

              data: {
                mobile:
                  "09000000001",
              },
            },
          );

        expect(
          otp.status(),
        ).toBe(
          403,
        );

        const checkout =
          await request.post(
            "/api/checkout/orders",
            {
              headers:
                malicious,

              data: {},
            },
          );

        expect(
          checkout.status(),
        ).toBe(
          403,
        );

        const payment =
          await request.post(
            "/api/payments/zarinpal/start",
            {
              headers:
                malicious,

              data: {
                orderId:
                  randomUUID(),
              },
            },
          );

        expect(
          payment.status(),
        ).toBe(
          403,
        );
      },
    );

    test(
      "OTP is one-time and authenticated checkout is idempotent",
      async ({
        request,
      }) => {
        const mobile =
          createTestMobile();

        track(
          "mobile",
          mobile,
        );

        const unique =
          randomUUID()
            .replace(
              /-/g,
              "",
            );

        const email =
          `e2e+${unique}@eloria.invalid`;

        const otpRequest =
          await request.post(
            "/api/customer/auth/request-otp",
            {
              headers:
                trustedHeaders(),

              data: {
                mobile,
              },
            },
          );

        expect(
          otpRequest.status(),
        ).toBe(
          200,
        );

        const otp =
          (await otpRequest.json()) as {
            successful:
              boolean;

            challengeId:
              string;

            developmentCode?:
              string;
          };

        expect(
          otp.successful,
        ).toBe(
          true,
        );

        expect(
          otp.challengeId,
        ).toBeTruthy();

        expect(
          otp.developmentCode,
        ).toBe(
          "246810",
        );

        /*
         * Incorrect OTP must fail.
         */
        const wrongOtp =
          await request.post(
            "/api/customer/auth/verify-otp",
            {
              headers:
                trustedHeaders(),

              data: {
                challengeId:
                  otp.challengeId,

                mobile,

                code:
                  "111111",
              },
            },
          );

        expect(
          wrongOtp.status(),
        ).toBe(
          400,
        );

        /*
         * Correct OTP authenticates the customer.
         */
        const correctOtp =
          await request.post(
            "/api/customer/auth/verify-otp",
            {
              headers:
                trustedHeaders(),

              data: {
                challengeId:
                  otp.challengeId,

                mobile,

                code:
                  "246810",
              },
            },
          );

        expect(
          correctOtp.status(),
        ).toBe(
          200,
        );

        /*
         * Tag the E2E account for deterministic cleanup.
         */
        const profile =
          await request.patch(
            "/api/customer/me",
            {
              headers:
                trustedHeaders(),

              data: {
                fullName:
                  "Eloria E2E User",

                email,
              },
            },
          );

        expect(
          profile.status(),
        ).toBe(
          200,
        );

        /*
         * OTP challenge must be strictly one-time.
         */
        const reusedOtp =
          await request.post(
            "/api/customer/auth/verify-otp",
            {
              headers:
                trustedHeaders(),

              data: {
                challengeId:
                  otp.challengeId,

                mobile,

                code:
                  "246810",
              },
            },
          );

        expect(
          reusedOtp.status(),
        ).toBe(
          400,
        );

        /*
         * Session cookie must authenticate /me.
         */
        const me =
          await request.get(
            "/api/customer/me",
          );

        expect(
          me.status(),
        ).toBe(
          200,
        );

        const idempotencyKey =
          `e2e:${randomUUID()}`;

        const checkoutBody = {
          idempotencyKey,

          locale:
            "en",

          customer: {
            fullName:
              "Eloria E2E User",

            mobile,

            email,

            province:
              "Tehran",

            city:
              "Tehran",

            postalCode:
              "1234567890",

            address:
              "Eloria automated checkout test address number one.",
          },

          items: [
            {
              slug:
                E2E_PRODUCT_SLUG,

              variantId:
                null,

              quantity:
                1,
            },
          ],
        };

        /*
         * First submission creates an order.
         */
        const first =
          await request.post(
            "/api/checkout/orders",
            {
              headers:
                trustedHeaders(),

              data:
                checkoutBody,
            },
          );

        expect(
          first.status(),
        ).toBe(
          201,
        );

        const firstPayload =
          (await first.json()) as {
            successful:
              boolean;

            reused:
              boolean;

            order: {
              id:
                string;
            };
          };

        expect(
          firstPayload.successful,
        ).toBe(
          true,
        );

        expect(
          firstPayload.reused,
        ).toBe(
          false,
        );

        track(
          "order",
          firstPayload.order.id,
        );

        /*
         * Same idempotency key must return the same order.
         */
        const second =
          await request.post(
            "/api/checkout/orders",
            {
              headers:
                trustedHeaders(),

              data:
                checkoutBody,
            },
          );

        expect(
          second.status(),
        ).toBe(
          200,
        );

        const secondPayload =
          (await second.json()) as {
            successful:
              boolean;

            reused:
              boolean;

            order: {
              id:
                string;
            };
          };

        expect(
          secondPayload.successful,
        ).toBe(
          true,
        );

        expect(
          secondPayload.reused,
        ).toBe(
          true,
        );

        expect(
          secondPayload.order.id,
        ).toBe(
          firstPayload.order.id,
        );

        /*
         * Anonymous client cannot start payment
         * for an authenticated customer's order.
         */
        const anonymous =
          await playwrightRequest.newContext(
            {
              baseURL:
                BASE_URL,

              extraHTTPHeaders:
                trustedHeaders(),
            },
          );

        try {
          const denied =
            await anonymous.post(
              "/api/payments/zarinpal/start",
              {
                data: {
                  orderId:
                    firstPayload.order.id,
                },
              },
            );

          expect(
            denied.status(),
          ).toBe(
            403,
          );
        } finally {
          await anonymous.dispose();
        }
      },
    );

    test(
      "checkout rejects malformed input",
      async ({
        request,
      }) => {
        const response =
          await request.post(
            "/api/checkout/orders",
            {
              headers:
                trustedHeaders(),

              data: {},
            },
          );

        expect(
          response.status(),
        ).toBe(
          400,
        );

        const payload =
          (await response.json()) as {
            successful:
              boolean;

            code:
              string;
          };

        expect(
          payload.successful,
        ).toBe(
          false,
        );

        expect(
          payload.code,
        ).toBe(
          "INVALID_CHECKOUT",
        );
      },
    );

    test(
      "invalid payment callback fails safely",
      async ({
        request,
      }) => {
        const response =
          await request.get(
            "/api/payments/zarinpal/callback?locale=en",
            {
              maxRedirects:
                0,
            },
          );

        expect(
          [
            302,
            303,
            307,
            308,
          ],
        ).toContain(
          response.status(),
        );

        const location =
          response.headers()[
            "location"
          ] ?? "";

        expect(
          location,
        ).toContain(
          "/en/order/failed?reason=invalid-callback",
        );
      },
    );

    test(
      "unknown payment order cannot be started",
      async ({
        request,
      }) => {
        const response =
          await request.post(
            "/api/payments/zarinpal/start",
            {
              headers:
                trustedHeaders(),

              data: {
                orderId:
                  randomUUID(),
              },
            },
          );

        expect(
          response.status(),
        ).toBe(
          404,
        );
      },
    );
  },
);

test.describe(
  "ELORIA critical browser flows",
  () => {
    test.beforeEach(
      async ({
        page,
      }) => {
        await page.addInitScript(
          () => {
            window.sessionStorage.setItem(
              "eloria_intro_seen_v5",
              "1",
            );
          },
        );
      },
    );

    test(
      "product pricing breakdown exposes customer-safe components",
      async ({
        page,
      }) => {
        await page.goto(
          `/en/products/${E2E_PRODUCT_SLUG}`,
        );

        await expect(
          page.getByText(
            "Live raw gold rate",
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            "Making charge",
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            "Profit",
            {
              exact:
                true,
            },
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            "Artistic fee",
          ),
        ).toBeVisible();

        await expect(
          page.getByText(
            "Tax percentage",
          ),
        ).toHaveCount(
          0,
        );
      },
    );

    test(
      "admin authentication protects dashboard",
      async ({
        page,
      }, testInfo) => {
        test.setTimeout(
          90_000,
        );
        test.skip(
          testInfo.project.name !==
            "chromium-desktop",

          "Stateful admin authentication runs once.",
        );

        await page.goto(
          "/fa/admin",
        );

        await expect(
          page,
        ).toHaveURL(
          /\/fa\/admin\/login/,
        );

        await page
          .locator(
            'input[name="username"]',
          )
          .fill(
            "e2e-admin",
          );

        await page
          .locator(
            'input[name="password"]',
          )
          .fill(
            "E2E-only-password-123456789",
          );

        /*
         * Avoid Persian text locators so Windows console
         * encoding cannot corrupt the test fixture.
         */
        await page
          .locator(
            'button[type="submit"]',
          )
          .click();

        await expect(
          page,
        ).toHaveURL(
          /\/fa\/admin$/,
        );

        await page.goto(
          "/fa/admin/products",
        );

        await expect(
          page,
        ).toHaveURL(
          /\/fa\/admin\/products/,
        );

        await page.goto(
          "/fa/admin/orders",
        );

        await expect(
          page,
        ).toHaveURL(
          /\/fa\/admin\/orders/,
        );
      },
    );

    test(
      "critical mobile pages have no horizontal overflow",
      async ({
        page,
      }, testInfo) => {
        test.setTimeout(
          180_000,
        );
        test.skip(
          !testInfo.project.name.includes(
            "mobile",
          ),

          "Mobile-only contract.",
        );

        const routes = [
          "/en",
          "/en/products",
          `/en/products/${E2E_PRODUCT_SLUG}`,
          "/en/login",
          "/en/cart",
          "/en/checkout",
        ];

        for (
          const route of
          routes
        ) {
          await page.goto(
            route,
            {
              waitUntil:
                "domcontentloaded",

              timeout:
                45_000,
            },
          );

          const overflow =
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth >
                window.innerWidth +
                  1,
            );

          expect(
            overflow,
            `Horizontal overflow on ${route}`,
          ).toBe(
            false,
          );
        }
      },
    );
  },
);
