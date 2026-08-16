import {
  defineConfig,
  devices,
} from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: Boolean(
    process.env.CI,
  ),
  retries:
    process.env.CI
      ? 1
      : 0,
  workers: 1,
  reporter:
    process.env.CI
      ? [
          ["list"],
          [
            "html",
            {
              outputFolder:
                "playwright-report",
              open: "never",
            },
          ],
        ]
      : "list",

  expect: {
    timeout: 10_000,
  },

  use: {
    baseURL:
      "http://127.0.0.1:3000",
    trace:
      "retain-on-failure",
    screenshot:
      "only-on-failure",
    video: "off",
    actionTimeout: 10_000,
    navigationTimeout:
      30_000,
  },

  projects: [
    {
      name:
        "chromium-desktop",
      use: {
        ...devices[
          "Desktop Chrome"
        ],
      },
    },
    {
      name:
        "webkit-desktop",
      use: {
        ...devices[
          "Desktop Safari"
        ],
      },
    },
  ],

  webServer: {
    command:
      "npm run dev -- --hostname 127.0.0.1",
    url:
      "http://127.0.0.1:3000/api/health?mode=live",
    reuseExistingServer:
      !process.env.CI,
    timeout: 180_000,
    env: {
      ...process.env,
      NEXT_PUBLIC_SITE_URL:
        "http://127.0.0.1:3000",
    },
  },
});
