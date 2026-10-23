import { expect, test } from "@playwright/test";
test("public circular pieces, original treasury routes and quick view", async ({
  page,
}, info) => {
  const expectedPieces = Number(info.config.metadata.homeProductCount ?? 8);
  expect(expectedPieces).toBeGreaterThan(0);
  expect(expectedPieces).toBeLessThanOrEqual(8);
  await page.goto("/fa#featured");
  await expect(
    page.locator(".eloria-home .medallion"),
    "The home must display all expected public products with images",
  ).toHaveCount(expectedPieces);
  for (const key of ["gold", "silver", "weave"])
    await expect(page.locator(`.portal.${key}`)).toHaveAttribute(
      "href",
      `/fa/collections/${key}`,
    );
  await page.locator("#featured").scrollIntoViewIfNeeded();
  await expect(page.locator(".hero-actions .eloria-cta-secondary")).toHaveAttribute("href", "/fa/products");
  await expect
    .poll(() =>
      page
        .locator(".medallion .eloria-circle-subject img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  const checks = await page
    .locator(".medallion .image-seat")
    .evaluateAll((seats) =>
      seats.map((seat) => {
        const circle = seat.getBoundingClientRect(),
          frame = seat.closest(".product-photo")!.getBoundingClientRect();
        return {
          round: Math.abs(circle.width - circle.height) < 1,
          radius: getComputedStyle(seat).borderTopLeftRadius,
          contained:
            circle.left >= frame.left &&
            circle.right <= frame.right &&
            circle.top >= frame.top &&
            circle.bottom <= frame.bottom,
          fit: getComputedStyle(seat.querySelector(".eloria-circle-subject img")!).objectFit,
        };
      }),
    );
  for (const check of checks) {
    expect(check.round).toBe(true);
    expect(check.contained).toBe(true);
    expect(check.fit).toBe("contain");
    expect(check.radius).toBe("50%");
  }
  for (const selector of [".hero-copy h1 em", ".story h2"]) {
    const font = await page.locator(selector).evaluate(element => getComputedStyle(element).fontFamily);
    expect(font).toContain((page.viewportSize()?.width ?? 1440) > 760 ? "Eloria Iran Nastaliq" : "Eloria Vazir");
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("featured.png"),
    fullPage: true,
  });
  const trigger = page.locator(".quick-view-label").first();
  await trigger.click();
  await expect(page.locator(".home-quick-dialog")).toBeVisible();
  await expect(
    page.locator(".home-quick-dialog .dialog-photo img"),
  ).toBeVisible();
  await expect(page.locator(".home-quick-dialog .button")).toHaveAttribute(
    "href",
    /\/fa\/products\//,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".home-quick-dialog")).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.goto(
    (await page
      .locator(".product-description h3 a")
      .first()
      .getAttribute("href"))!,
  );
  await expect(page.locator(".eloria-glass-storefront")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth + 1,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("product.png"),
    fullPage: true,
  });
  await page.goto("/fa/collections/gold");
  await expect(page.locator(".eloria-glass-storefront")).toBeVisible();
  await page.screenshot({
    path: info.outputPath("treasury.png"),
    fullPage: true,
  });
});
test("hero respects reduced motion; admin is protected", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fa#hero");
  await expect(
    page.locator(".hero-scale .eloria-circle-subject img"),
    "A live product image must remain visible even before cutout preparation",
  ).toBeVisible();
  expect(
    await page
      .locator(".photo-float")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
  await page.goto("/fa/admin/appearance");
  await expect(page).toHaveURL(/\/fa\/admin\/login/);
});

test("intro is mounted, uses the device rendition and permits skipping", async ({ page }) => {
  await page.goto("/fa");
  const first = page.locator(".eloria-intro-root video").first();
  await expect(first).toHaveAttribute("src", (page.viewportSize()?.width ?? 1440) <= 1024 ? /eloria-entry-mobile/ : /eloria-entry-v3/);
  await expect(first).toHaveJSProperty("muted", true);
  await expect(first).toHaveJSProperty("playsInline", true);
  await page.getByRole("button", { name: "رد کردن اینترو و ورود به سایت" }).click();
  await expect(page.locator(".eloria-intro-root")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "پخش ویدئوی ورود", exact: true })).toBeVisible();
});
