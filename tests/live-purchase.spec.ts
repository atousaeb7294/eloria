import { expect, test } from "@playwright/test";

const quote = (stock: number, purchasable = true) => ({
  successful: true,
  product: { slug: "mehr-necklace", stock, isPurchasable: purchasable, material: "GOLD", weightGrams: "1" },
  variant: null,
  pricing: { mode: "MANUAL", finalPriceToman: "1000000", breakdown: null },
  liveRate: null,
});

for (const locale of ["fa", "en"]) {
  test(`${locale}: pending, failed, available and sold quotes remain distinct`, async ({ page }) => {
    await page.addInitScript(() => sessionStorage.setItem("eloria_intro_complete_v12", "1"));
    let respond: (() => void) | undefined;
    let result = quote(3);
    let status = 200;
    await page.route("**/api/products/mehr-necklace/price*", async route => {
      await new Promise<void>(resolve => { respond = resolve; });
      await route.fulfill({ status, json: status === 200 ? result : { successful: false } });
    });
    await page.goto(`/${locale}/products/mehr-necklace`);
    const box = page.locator(".eloria-live-purchase");
    const pending = locale === "fa" ? "در حال بررسی قیمت و موجودی…" : "Checking price and availability…";
    await expect(box.getByRole("button", { name: pending })).toBeDisabled();
    await expect(box.getByText(/فروخته شده|^Sold$/)).toHaveCount(0);
    await expect.poll(() => Boolean(respond)).toBe(true);
    status = 503;
    respond!();
    await expect(box.getByRole("button", { name: locale === "fa" ? "بررسی قیمت و موجودی ناموفق بود" : "Price and availability check failed" })).toBeDisabled();
    await expect(box.getByRole("link")).toHaveCount(0);

    const refresh = async () => {
      respond = undefined;
      await page.evaluate(() => window.dispatchEvent(new Event("online")));
      await expect.poll(() => Boolean(respond)).toBe(true);
      respond!();
    };
    status = 200;
    await refresh();
    await box.getByRole("button", { name: locale === "fa" ? "افزودن به سبد خرید" : "Add to shopping bag" }).click();
    const increase = box.getByRole("button", { name: locale === "fa" ? "افزایش تعداد" : "Increase quantity" });
    await expect(increase).toBeEnabled();
    result = quote(3, false);
    await refresh();
    await expect(increase).toBeDisabled();
    result = quote(0, false);
    await refresh();
    await expect(box.getByRole("link", { name: locale === "fa" ? "ثبت درخواست پیش‌سفارش" : "Request a preorder" })).toBeVisible();
  });
}
