# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: eloria-visual.spec.ts >> Hero actions and all-creations catalog are connected
- Location: tests\eloria-visual.spec.ts:5:5

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'تمام آثار الوریا' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'تمام آثار الوریا' })

```

```yaml
- alert
- status: Loading catalog
```

# Test source

```ts
  1  | import { expect, test } from "@playwright/test";
  2  | 
  3  | const mobileWidths = [320, 375, 430];
  4  | 
  5  | test("Hero actions and all-creations catalog are connected", async ({ page }) => {
  6  |   await page.goto("/fa#hero");
  7  | 
  8  |   await expect(page.locator(".eloria-intro-root")).toBeHidden();
  9  |   await expect(
  10 |     page.getByRole("heading", { name: /روایتی ماندگار/ }),
  11 |   ).toBeVisible();
  12 | 
  13 |   const creationsLink = page.getByRole("link", { name: "تماشای آثار" });
  14 |   await expect(creationsLink).toHaveAttribute("href", "/fa/products");
  15 | 
  16 |   await creationsLink.click();
  17 |   await expect(page).toHaveURL(/\/fa\/products/);
  18 |   await expect(
  19 |     page.getByRole("heading", { name: "تمام آثار الوریا" }),
> 20 |   ).toBeVisible();
     |     ^ Error: expect(locator).toBeVisible() failed
  21 | 
  22 |   await expect(page.getByText("جست‌وجو و فیلتر")).toBeVisible();
  23 |   await expect(page.getByText("وضعیت موجودی")).toBeVisible();
  24 | });
  25 | 
  26 | for (const width of mobileWidths) {
  27 |   test(`mobile layout has no horizontal overflow at ${width}px`, async ({ page }) => {
  28 |     await page.setViewportSize({ width, height: 844 });
  29 |     await page.goto("/fa/products");
  30 | 
  31 |     await expect(
  32 |       page.getByRole("heading", { name: "تمام آثار الوریا" }),
  33 |     ).toBeVisible();
  34 | 
  35 |     const hasHorizontalOverflow = await page.evaluate(
  36 |       () => document.documentElement.scrollWidth > window.innerWidth + 1,
  37 |     );
  38 | 
  39 |     expect(hasHorizontalOverflow).toBe(false);
  40 |   });
  41 | }
  42 | 
  43 | test("mobile menu exposes the restored all-creations route", async ({ page }) => {
  44 |   await page.setViewportSize({ width: 390, height: 844 });
  45 |   await page.goto("/fa/about");
  46 | 
  47 |   await page.getByRole("button", { name: "بازکردن منوی اصلی" }).click();
  48 |   const allCreations = page.getByRole("link", { name: /تمام آثار/ }).first();
  49 | 
  50 |   await expect(allCreations).toBeVisible();
  51 |   await expect(allCreations).toHaveAttribute("href", "/fa/products");
  52 | });
  53 | 
```