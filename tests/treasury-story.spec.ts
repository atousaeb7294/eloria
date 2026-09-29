import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("eloria_intro_complete_v12", "1"),
  );
  await page.route("**/api/treasury/preview?*", (route) =>
    route.fulfill({
      json: {
        source: "database",
        items: [
          {
            slug: "qa-gold",
            name: "نمونه آزمون طلا",
            imageUrl: "/images/treasuries/gold.webp",
            hasGold: true,
            hasSilver: false,
          },
          {
            slug: "qa-mixed",
            name: "نمونه آزمون ترکیبی",
            imageUrl: "/images/treasuries/silver.webp",
            hasGold: true,
            hasSilver: true,
          },
          {
            slug: "qa-weave",
            name: "نمونه آزمون بافت",
            imageUrl: "/images/treasuries/weave.webp",
            hasGold: false,
            hasSilver: false,
          },
        ],
      },
    }),
  );
  await page.route("**/api/metal-prices", (route) =>
    route.fulfill({
      json: {
        successful: true,
        prices: [
          {
            material: "GOLD",
            pricePerGramToman: "10000000",
            referencePurity: 750,
            isStale: false,
            marketTimestamp: new Date().toISOString(),
          },
        ],
      },
    }),
  );
});

test("chapters land fully, thumbnails match membership, footer releases", async ({
  page,
}, info) => {
  await page.goto("/fa");
  const story = page.locator(".eloria-promenade");
  await expect(story).toHaveAttribute("data-story-enhanced", "");
  for (let index = 1; index <= 3; index++) {
    if (info.project.name.includes("mobile")) {
      // Native page movement followed by touch/scroll idle settling.
      const touch = await page.context().newCDPSession(page);
      const size = page.viewportSize()!;
      const x = Math.round(size.width * 0.5);
      const startY = Math.round(size.height * 0.72);
      try {
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchStart", touchPoints: [{ x, y: startY }]
        });
        for (let step = 1; step <= 12; step++) {
          await touch.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{
              x, y: Math.round(startY - size.height * 0.35 * step / 12)
            }]
          });
          await page.evaluate(() =>
            new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
          );
        }
        await touch.send("Input.dispatchTouchEvent", {
          type: "touchEnd", touchPoints: []
        });
      } finally {
        await touch.detach();
      }
    } else {
      await page.mouse.move(700, 400);
      await page.mouse.wheel(0, 100);
    }
    await expect(story).toHaveAttribute("data-story-chapter", String(index));
    await expect(story).not.toHaveAttribute("data-story-moving", "true");
    const chapter = page.locator("[data-promenade-chapter]").nth(index);
    await expect(chapter).toHaveAttribute("aria-hidden", "false");
    const rect = await chapter.boundingBox();
    expect(Math.abs(rect!.y)).toBeLessThan(2);
    expect(rect!.height).toBeGreaterThan(
      (page.viewportSize()?.height ?? 700) * 0.85,
    );
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    ).toBe(true);
    const expected = index === 1 ? 2 : 1;
    await expect(
      chapter.locator('.eloria-treasury-miniatures a[href*="/products/"]'),
    ).toHaveCount(expected);
    await page.screenshot({ path: info.outputPath(`chapter-${index}.png`) });
  }
  await page.getByRole("link", { name: "ادامه", exact: true }).click();
  await expect(page.locator("footer").first()).toBeInViewport();
  await page.screenshot({ path: info.outputPath("footer.png") });
});

test("reduced motion leaves all chapters reachable in normal flow", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/fa");
  await expect(page.locator(".eloria-promenade")).not.toHaveAttribute(
    "data-story-enhanced",
    "",
  );
  await expect(page.locator("[data-promenade-chapter][inert]")).toHaveCount(0);
  await page.locator("#treasury-weave").scrollIntoViewIfNeeded();
  await expect(page.locator('#treasury-weave .eloria-treasury-enter')).toBeVisible();
});

test("navigation leaves no running story animation and loads the treasury", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await page.goto("/fa#treasury-gold");
  const story = page.locator('.eloria-promenade');
  await expect(story).toHaveAttribute('data-story-chapter', '1');
  await page.locator('#treasury-gold .eloria-treasury-enter').click();
  await expect(page).toHaveURL(/\/fa\/collections\/gold/);
  await expect(page.locator('#main-content')).toBeVisible();
  await expect(story).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("wheel burst stays on one chapter and home resets", async ({ page }, info) => {
  test.skip(info.project.name.includes('mobile'), 'desktop wheel interaction');
  await page.goto('/fa');
  const story = page.locator('.eloria-promenade');
  await expect(story).toHaveAttribute('data-story-enhanced', '');
  await page.mouse.move(700, 400);
  await page.evaluate(async () => {
    for (let index = 0; index < 20; index++) {
      window.dispatchEvent(new WheelEvent('wheel', { deltaY:120, cancelable:true }));
      await new Promise(resolve => setTimeout(resolve, 80));
    }
  });
  await expect(story).toHaveAttribute('data-story-chapter', '1');
  await expect(story).not.toHaveAttribute('data-story-moving', 'true');
  await page.evaluate(() => window.dispatchEvent(new Event('eloria:reset-home')));
  await expect(story).toHaveAttribute('data-story-chapter', '0');
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});
