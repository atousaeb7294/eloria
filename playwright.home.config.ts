import { defineConfig, devices } from "@playwright/test";
// Run after an admin saves eight real products; no automatic login/data mutation.
export default defineConfig({
  testDir: "./tests",
  testMatch: "home-design.spec.ts",
  workers: 1,
  timeout: 45_000,
  outputDir: "test-results/home-design",
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report/home-design", open: "never" }],
  ],
  use: {
    baseURL: process.env.ELORIA_TEST_BASE_URL || "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    {
      name: "small-mobile",
      use: { ...devices["Pixel 5"], viewport: { width: 320, height: 740 } },
    },
    { name: "tablet", use: { ...devices["iPad Mini"] } },
  ],
});
