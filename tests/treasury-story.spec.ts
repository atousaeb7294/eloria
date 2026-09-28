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
      await page.evaluate(() => window.scrollBy(0, window.innerHeight * 0.25));
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
  await expect(page.getByRole("heading", { name: "تار جان" })).toBeVisible();
});
