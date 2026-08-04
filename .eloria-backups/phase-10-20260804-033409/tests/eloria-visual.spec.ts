import { expect, test } from "@playwright/test";

const mobileWidths = [320, 375, 430];

test("Hero actions and all-creations catalog are connected", async ({ page }) => {
  await page.goto("/fa#hero");

  await expect(page.locator(".eloria-intro-root")).toBeHidden();
  await expect(
    page.getByRole("heading", { name: /روایتی ماندگار/ }),
  ).toBeVisible();

  const creationsLink = page.getByRole("link", { name: "تماشای آثار" });
  await expect(creationsLink).toHaveAttribute("href", "/fa/products");

  await creationsLink.click();
  await expect(page).toHaveURL(/\/fa\/products/);
  await expect(
    page.getByRole("heading", { name: "تمام آثار الوریا" }),
  ).toBeVisible();

  await expect(page.getByText("جست‌وجو و فیلتر")).toBeVisible();
  await expect(page.getByText("وضعیت موجودی")).toBeVisible();
});

for (const width of mobileWidths) {
  test(`mobile layout has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/fa/products");

    await expect(
      page.getByRole("heading", { name: "تمام آثار الوریا" }),
    ).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );

    expect(hasHorizontalOverflow).toBe(false);
  });
}

test("mobile menu exposes the restored all-creations route", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/fa/about");

  await page.getByRole("button", { name: "بازکردن منوی اصلی" }).click();
  const allCreations = page.getByRole("link", { name: /تمام آثار/ }).first();

  await expect(allCreations).toBeVisible();
  await expect(allCreations).toHaveAttribute("href", "/fa/products");
});
