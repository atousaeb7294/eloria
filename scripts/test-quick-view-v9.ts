import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import Image from "next/image";
import { QuickViewImage } from "../src/components/quick-view-image";
import { quickViewMediaSource, loadedCardPreview, warmQuickView } from "../src/lib/quick-view-media";

async function main() {
  const id = "12345678-1234-4234-8234-123456789abc";
  const src = `/api/media/products/${id}`;
  const preview = `${src}?w=320&format=webp`;
  for (const viewport of [320, 360, 390, 430, 760, 1024, 1440, 1920]) {
    const url = new URL(quickViewMediaSource(src, { viewport, dpr: 3 })!, "https://eloriagallery.ir");
    assert.equal(url.searchParams.get("format"), "webp");
    assert(Number(url.searchParams.get("w")) <= (viewport <= 760 ? 800 : 960));
  }
  assert(quickViewMediaSource(src, { viewport: 430, dpr: 3, saveData: true })!.includes("w=640"));
  assert(quickViewMediaSource(src.replace("products", "hero"), { viewport: 390, dpr: 2 })!.includes("format=webp"));
  assert.equal(quickViewMediaSource("https://example.com/photo.jpg", { viewport: 390, dpr: 2 }), null);

  const photo = { complete: true, naturalWidth: 320, currentSrc: preview };
  const trigger = { closest: () => ({ querySelector: () => photo }) } as unknown as HTMLElement;
  assert.equal(loadedCardPreview(trigger), preview);
  photo.complete = false; assert.equal(loadedCardPreview(trigger), undefined);
  photo.complete = true; photo.naturalWidth = 0; assert.equal(loadedCardPreview(trigger), undefined);
  photo.naturalWidth = 320; photo.currentSrc = "/images/brand/eloria-logo.webp";
  assert.equal(loadedCardPreview(trigger), undefined);

  const markup = renderToStaticMarkup(createElement(QuickViewImage, { src, previewSrc: preview, alt: "selected product", locale: "en" }));
  assert(markup.includes("quick-photo-preview"));
  assert(markup.includes('fetchPriority="high"'));
  assert(!markup.includes('loading="lazy"'));
  assert(!markup.includes("/_next/image"));
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  let view!: ReactTestRenderer;
  await act(async () => { view = create(createElement(QuickViewImage, { src, previewSrc: preview, alt: "product", locale: "en" })); });
  const detail = () => view.root.findAllByType(Image).find(image => image.props.className.includes("quick-photo-detail"))!;
  const previews = () => view.root.findAllByType(Image).filter(image => image.props.className === "quick-photo-preview");
  assert.equal(previews().length, 1);
  await act(async () => { detail().props.onError(); });
  assert.equal(previews().length, 1, "A network error must not remove the already loaded card");
  await act(async () => { view.root.findByType("button").props.onClick(); });
  assert.equal(previews().length, 1);
  await act(async () => { detail().props.onLoad(); });
  assert.equal(previews().length, 0);
  assert(detail().props.className.includes("is-ready"));
  await act(async () => { view.update(createElement(QuickViewImage, { key: "another", src: src.replace("789abc", "789abd"), alt: "another", locale: "fa" })); });
  assert.equal(previews().length, 0, "A different product must not inherit the old preview");
  assert(view.root.findByProps({ role: "status" }));
  await act(async () => { view.unmount(); });

  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  const images: MockImage[] = [];
  class MockImage {
    onload?: () => void; onerror?: () => void; src = ""; decoding = ""; fetchPriority = "";
    constructor() { images.push(this); }
  }
  const connection = { saveData: false, effectiveType: "4g" };
  try {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { Image: MockImage, innerWidth: 390, devicePixelRatio: 3 } });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { connection } });
    warmQuickView(src); warmQuickView(src); assert.equal(images.length, 1);
    warmQuickView(src.replace("789abc", "789abd"));
    warmQuickView(src.replace("789abc", "789abe"));
    assert.equal(images.length, 2, "Only two intent requests can compete with visible photos");
    images[0].onload!(); warmQuickView(src.replace("789abc", "789abe"));
    assert.equal(images.length, 3);
    images[1].onerror!();
    connection.saveData = true; warmQuickView(src.replace("789abc", "789abf"));
    assert.equal(images.length, 3, "Save-data must disable speculative downloads");
    connection.saveData = false; connection.effectiveType = "3g";
    warmQuickView(src.replace("789abc", "789abf")); assert.equal(images.length, 3);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow); else Reflect.deleteProperty(globalThis, "window");
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator); else Reflect.deleteProperty(globalThis, "navigator");
  }
  console.log("PASS: dialog image caps, direct media, immediate selected-card preview, load/error/retry, switching products, bounded intent warming, save-data and slow-network behavior.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
