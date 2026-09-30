import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { LivePurchaseBox } from "../src/components/live-purchase-box";

// Quick shop has no initial quote. Unknown stock must never render as sold.
for (const locale of ["fa", "en"]) {
  const html = renderToStaticMarkup(createElement(LivePurchaseBox, {
    locale, slug: "available-product",
  }));
  assert.match(html, locale === "fa" ? /در حال بررسی قیمت و موجودی/ : /Checking price and availability/);
  assert.match(html, /disabled=""/);
  assert.match(html, /aria-busy="true"/);
  assert.doesNotMatch(html, /فروخته شده|Sold|Request a preorder|ثبت درخواست پیش‌سفارش/);
}
console.log("PASS: quick shop first render in Persian and English shows pending availability, never sold or preorder.");
