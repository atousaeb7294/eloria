import { expect, test, type Page } from "@playwright/test";
import { INTRO_SESSION_KEY } from "../src/components/intro/eloria-intro-config";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => sessionStorage.setItem(key, "1"), INTRO_SESSION_KEY);
});

async function expectNormalFlow(page: Page) {
  expect(await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    locked: [document.body, document.documentElement].some(element =>
      ["hidden", "clip"].includes(getComputedStyle(element).overflowY)),
  }))).toEqual({ overflow: false, locked: false });
}

test("all treasury links are reachable in normal flow and the footer is accessible", async ({ page }, info) => {
  await page.goto("/fa");
  await expect(page.locator(".eloria-home")).toBeVisible();
  await expect(page.locator(".eloria-intro-root")).toHaveCount(0);
  for (const key of ["gold", "silver", "weave"]) {
    const portal = page.locator(`.eloria-home .portal.${key}`);
    await expect(portal).toHaveAttribute("href", `/fa/collections/${key}`);
    await portal.scrollIntoViewIfNeeded();
    await expect(portal).toBeInViewport();
    await portal.focus();
    await expect(portal).toBeFocused();
  }
  const footer = page.locator("footer").first();
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toBeInViewport();
  await expectNormalFlow(page);
  await page.screenshot({ path: info.outputPath("home-footer.png") });
});

test("reduced motion stops the hero and leaves every treasury reachable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fa");
  await expect(page.locator(".eloria-home")).toHaveClass(/paused/);
  await expect(page.locator(".motion")).toBeDisabled();
  await expect(page.locator(".motion")).toHaveAttribute("aria-pressed", "true");
  expect(await page.locator(".photo-float").evaluate(element =>
    getComputedStyle(element).animationName)).toBe("none");
  const weave = page.locator(".portal.weave");
  await weave.scrollIntoViewIfNeeded();
  await expect(weave).toBeInViewport();
  await expect(weave).toHaveAttribute("href", "/fa/collections/weave");
  await expectNormalFlow(page);
});

test("treasury navigation loads the destination and releases the home", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/fa#treasuries");
  await page.locator(".portal.gold").click();
  await expect(page).toHaveURL(/\/fa\/collections\/gold(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "گنجینهٔ طلا", exact: true })).toBeVisible();
  await expect(page.locator(".eloria-home")).toHaveCount(0);
  await expectNormalFlow(page);
  expect(errors).toEqual([]);
});

test("hero anchor reaches treasuries and returning home restores the hero", async ({ page }) => {
  await page.goto("/fa#hero");
  await page.locator(".hero-actions a[href='#treasuries']").click();
  await expect(page).toHaveURL(/#treasuries$/);
  await expect(page.locator("#treasuries")).toBeInViewport();
  await page.locator(".portal.silver").click();
  await expect(page).toHaveURL(/\/fa\/collections\/silver(?:\?|$)/);
  await expect(page.getByRole("heading", { name: "گنجینهٔ نقره", exact: true })).toBeVisible();
  await page.goto("/fa#hero");
  await expect(page.locator(".hero-copy h1")).toBeInViewport();
  await expect(page.locator(".eloria-intro-root")).toHaveCount(0);
  await expectNormalFlow(page);
});
