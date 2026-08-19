import {
  defineConfig,
  devices,
  type Project,
} from "@playwright/test";

const E2E_BASE_URL =
  "http:" +
  "//127.0.0.1:3100";

const isCi =
  Boolean(
    process.env.CI,
  );

const runFullBrowserMatrix =
  isCi ||
  process.env
    .ELORIA_E2E_FULL_BROWSERS
    ?.trim()
    .toLowerCase() ===
    "true";

const localChromiumChannel =
  !isCi
    ? (
        process.env
          .ELORIA_E2E_CHANNEL
          ?.trim() ||
        "chrome"
      )
    : undefined;

function e2eUserAgent(
  project: string,
): string {
  return `ELORIA-E2E-PLAYWRIGHT/${project}`;
}

const chromiumProjects:
  Project[] = [
    {
      name:
        "chromium-desktop",

      use: {
        ...devices[
          "Desktop Chrome"
        ],

        channel:
          localChromiumChannel,

        userAgent:
          e2eUserAgent(
            "chromium-desktop",
          ),
      },
    },

    {
      name:
        "chromium-mobile",

      use: {
        ...devices[
          "Pixel 5"
        ],

        channel:
          localChromiumChannel,

        userAgent:
          e2eUserAgent(
            "chromium-mobile",
          ),
      },
    },
  ];

const webkitProjects:
  Project[] = [
    {
      name:
        "webkit-desktop",

      use: {
        ...devices[
          "Desktop Safari"
        ],

        userAgent:
          e2eUserAgent(
            "webkit-desktop",
          ),
      },
    },

    {
      name:
        "webkit-mobile",

      use: {
        ...devices[
          "iPhone 13"
        ],

        userAgent:
          e2eUserAgent(
            "webkit-mobile",
          ),
      },
    },
  ];

export default defineConfig({
  testDir:
    "./tests",

  fullyParallel:
    false,

  forbidOnly:
    isCi,

  retries:
    isCi
      ? 1
      : 0,

  workers:
    1,

  reporter:
    isCi
      ? [
          ["list"],
          [
            "html",
            {
              outputFolder:
                "playwright-report",

              open:
                "never",
            },
          ],
        ]
      : "list",

  expect: {
    timeout:
      10_000,
  },

  use: {
    baseURL:
      E2E_BASE_URL,

    trace:
      "retain-on-failure",

    screenshot:
      "only-on-failure",

    video:
      "off",

    actionTimeout:
      10_000,

    navigationTimeout:
      30_000,
  },

  projects:
    runFullBrowserMatrix
      ? [
          ...chromiumProjects,
          ...webkitProjects,
        ]
      : chromiumProjects,

  webServer: {
    command:
      "npm run dev -- --hostname 127.0.0.1 --port 3100",

    url:
      `${E2E_BASE_URL}/api/health?mode=live`,

    reuseExistingServer:
      false,

    timeout:
      180_000,

    env: {
      ...process.env,

      NODE_ENV:
        "development",

      NEXT_PUBLIC_SITE_URL:
        E2E_BASE_URL,

      ELORIA_COMMERCE_ENABLED:
        "true",

      ELORIA_CUSTOMER_AUTH_ENABLED:
        "true",

      ELORIA_DYNAMIC_PRICING_ENABLED:
        "true",

      /*
       * Never contact real Zarinpal from E2E.
       */
      ELORIA_PAYMENT_ENABLED:
        "false",

      ELORIA_SUPPORT_ENABLED:
        "false",

      ELORIA_CUSTOMER_OTP_DEV_CODE:
        "246810",

      TURNSTILE_SECRET_KEY:
        "",

      NEXT_PUBLIC_TURNSTILE_SITE_KEY:
        "",

      ELORIA_ADMIN_USERNAME:
        "e2e-admin",

      ELORIA_ADMIN_PASSWORD:
        "E2E-only-password-123456789",

      ELORIA_ADMIN_SESSION_VERSION:
        "e2e-1",

      ELORIA_ADMIN_SESSION_SECRET:
        "eloria-e2e-admin-session-secret-0123456789-abcdefghijklmnopqrstuvwxyz",

      ELORIA_ADMIN_TOTP_SECRET:
        "",

      ELORIA_CUSTOMER_AUTH_SECRET:
        "eloria-e2e-customer-auth-secret-0123456789-abcdefghijklmnopqrstuvwxyz",

      ZARINPAL_MERCHANT_ID:
        "",
    },
  },
});
