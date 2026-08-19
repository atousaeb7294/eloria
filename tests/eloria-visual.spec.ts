import { expect, test } from "@playwright/test";

const mobileWidths = [320, 375, 430];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("eloria_intro_seen_v5", "1");
  });
});

test("health endpoints distinguish liveness from readiness", async ({ request }) => {
  const live = await request.get("/api/health?mode=live");
  expect(live.status()).toBe(200);

  const ready = await request.get("/api/health?mode=ready");
  expect(ready.status()).toBe(200);
});

test("Hero actions and the seeded catalog are connected", async ({ page }, testInfo) => {
  await page.goto("/fa#hero");

  await expect(page.locator(".eloria-intro-root")).toBeHidden();
  await expect(page.getByRole("heading", { name: /روایتی ماندگار/ })).toBeVisible();

  const creationsLink = page.getByRole("link", { name: "تماشای آثار" });
  await expect(creationsLink).toHaveAttribute("href", "/fa/products");
  await creationsLink.click();

  await expect(page).toHaveURL(/\/fa\/products/);
  await expect(page.getByRole("heading", { name: "تمام آثار الوریا" })).toBeVisible();
  await expect(page.getByText("جست‌وجو و فیلتر")).toBeVisible();
  if (!testInfo.project.name.includes("mobile")) {
    await expect(page.getByText("وضعیت موجودی")).toBeVisible();
  }
  await expect(page.getByText(/اثر پیدا شد/)).toBeVisible();
  await expect(page.locator("article").first()).toBeVisible();
});

for (const width of mobileWidths) {
  test(`mobile catalog has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/fa/products");

    await expect(page.getByRole("heading", { name: "تمام آثار الوریا" })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );

    expect(hasHorizontalOverflow).toBe(false);
  });
}

test("mobile menu exposes the all-creations route", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fa/about");

  await page.getByRole("button", { name: "بازکردن منوی اصلی" }).click();
  const allCreations = page.getByRole("link", { name: /تمام آثار/ }).first();

  await expect(allCreations).toBeVisible();
  await expect(allCreations).toHaveAttribute("href", "/fa/products");
});
