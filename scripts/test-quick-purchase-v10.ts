import assert from "node:assert/strict";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QuickPurchase } from "../src/components/quick-purchase";
import { LivePurchaseBox } from "../src/components/live-purchase-box";
import { AddToCartButton } from "../src/components/add-to-cart-button";
import { PreparedGalleryImage } from "../src/components/prepared-gallery-image";
import { ProductImage } from "../src/components/product-image";
import { readCartItems } from "../src/lib/cart-storage";
import type { HomePiece } from "../src/lib/home-design-data";

async function main() {
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const originals = new Map(["window", "self", "document", "navigator", "fetch"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const memory = new Map<string, string>();
  const browser = Object.assign(new EventTarget(), {
    setTimeout: (fn: () => void, ms: number) => { const timer = setTimeout(fn, ms); timer.unref(); return timer; },
    clearTimeout,
    setInterval: (fn: () => void, ms: number) => { const timer = setInterval(fn, ms); timer.unref(); return timer; },
    clearInterval,
    location: { pathname: "/fa", href: "https://example.invalid/fa" },
    localStorage: { getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value) },
  });
  Object.defineProperty(globalThis, "window", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "self", { configurable: true, value: browser });
  Object.defineProperty(globalThis, "document", { configurable: true, value: Object.assign(new EventTarget(), { visibilityState: "visible", documentElement: { dataset: {} } }) });
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { onLine: true } });
  const requests: string[] = [];
  let mode: "valid" | "failure" | "stale" | "mismatch" | "expired" | "short" = "valid";
  const fixture: HomePiece = { id: "fixture", slug: "bracelet", name: "Bracelet", imageUrl: "/photo.webp", group: "gold", variants: [
    { id: "sold", titleFa: "کوچک", titleEn: "Small", stock: 0 },
    { id: "available", titleFa: "متوسط", titleEn: "Medium", stock: 2 },
  ] };
  const response = (url: string) => {
    const variantId = new URL(url, "https://example.invalid").searchParams.get("variantId");
    return {
      successful: true,
      product: { id: "fixture", slug: "bracelet", stock: 2, material: "GOLD", isPurchasable: true },
      variant: variantId ? { id: mode === "mismatch" ? "wrong" : variantId, titleFa: variantId, titleEn: variantId, stock: variantId === "sold" ? 0 : 2 } : null,
      pricing: { mode: "MANUAL", finalPriceToman: "1234567", breakdown: null },
      liveRate: { isUsableForSale: mode !== "stale" },
      quote: { generatedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + (mode === "expired" ? -1000 : mode === "short" ? 80 : 120000)).toISOString() },
    };
  };
  Object.defineProperty(globalThis, "fetch", { configurable: true, value: async (url: string) => {
    requests.push(url);
    if (mode === "failure") throw new Error("simulated offline");
    return { ok: true, json: async () => response(url) };
  } });
  let view: ReactTestRenderer | undefined;
  const unmount = async () => { if (view) { await act(async () => view!.unmount()); view = undefined; } };
  try {
    await act(async () => { view = create(createElement(QuickPurchase, { piece: fixture, locale: "fa" })); });
    assert.equal(view!.root.findByType("select").props.value, "available");
    assert(requests.at(-1)?.endsWith("?variantId=available"));
    assert(requests.every(url => !url.includes("display=")), "Purchasing must never use a display-only quote");
    assert.equal(view!.root.findByType(AddToCartButton).props.disabled, false);
    const buy = view!.root.findAllByType("button").find(button => button.props.onClick && !button.props.disabled)!;
    await act(async () => buy.props.onClick());
    assert.deepEqual(readCartItems().map(({ slug, variantId, quantity }) => ({ slug, variantId, quantity })), [{ slug: "bracelet", variantId: "available", quantity: 1 }]);
    assert(view!.root.findAllByType("a").some(link => link.props.href === "/fa/cart"));
    assert(!view!.root.findAllByType("a").some(link => link.props.href.includes("/products/")), "Buying in quick view must not require the product page");
    await act(async () => view!.root.findByProps({ "aria-label": "افزایش تعداد" }).props.onClick());
    assert.equal(readCartItems()[0].quantity, 2);
    assert.equal(view!.root.findByProps({ "aria-label": "افزایش تعداد" }).props.disabled, true);
    await act(async () => view!.root.findByType("select").props.onChange({ target: { value: "sold" } }));
    assert.equal(view!.root.findByType(LivePurchaseBox).props.variantId, "sold");
    assert(view!.root.findAllByType("a").some(link => link.props.href === "/fa/preorder/bracelet"));
    assert.equal(view!.root.findAllByType(AddToCartButton).length, 0);
    await unmount();

    for (const guard of ["failure", "stale", "mismatch", "expired", "short"] as const) {
      memory.clear(); mode = guard;
      await act(async () => { view = create(createElement(QuickPurchase, { piece: fixture, locale: "fa" })); });
      if (guard === "short") await act(async () => { await new Promise(resolve => setTimeout(resolve, 120)); });
      assert(view!.root.findAllByType(AddToCartButton).every(button => button.props.disabled), `${guard} must block adding to cart`);
      assert.equal(readCartItems().length, 0);
      await unmount();
    }

    const ratios: [string, number][] = [];
    const images = [{ imageUrl: "/landscape.webp", alt: "Landscape" }, { imageUrl: "/portrait.webp", alt: "Portrait" }];
    const props = { images, index: 0, sizes: "300px", className: "photo", locale: "fa", onAspectRatio: (source: string, ratio: number) => ratios.push([source, ratio]) };
    await act(async () => { view = create(createElement(PreparedGalleryImage, props)); });
    const first = view!.root.findByType(ProductImage);
    assert.equal(first.props.loading, "eager");
    assert.equal(first.props.fetchPriority, "high");
    await act(async () => first.props.onLoad({ currentTarget: { naturalWidth: 1200, naturalHeight: 800 } }));
    await act(async () => view!.update(createElement(PreparedGalleryImage, { ...props, index: 1 })));
    await act(async () => view!.root.findByType(ProductImage).props.onLoad({ currentTarget: { naturalWidth: 800, naturalHeight: 1200 } }));
    assert.deepEqual(ratios, [["/landscape.webp", 1.5], ["/portrait.webp", 2 / 3]]);
    await unmount();
    console.log("PASS: quick purchase uses strict quotes, selects variants, adds the selected item, caps quantity, links to checkout, preserves preorder, blocks failed/stale/mismatched/expired quotes, and reports each gallery photo's own ratio.");
  } finally {
    await unmount();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
