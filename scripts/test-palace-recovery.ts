/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated browser doubles. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import * as products from "../src/components/home-palace/palace-products";
import { startPalaceEntry } from "../src/components/home-palace/palace-entry";
import assets from "../src/components/home-palace/palace-reference-assets.json";

const require = createRequire(import.meta.url);
function compile(file: string) {
  return ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
}
const catalogue = [
  { slug: "gold/دلبر", name: "دلبَر", imageUrl: "/api/media/products/real-delbar", hasGold: true, hasSilver: false },
  { slug: "silver", name: "نقره ماه", imageUrl: "/api/media/products/real-silver", hasGold: false, hasSilver: true },
  { slug: "weave", name: "مینای شب", imageUrl: "/api/media/products/real-weave", hasGold: false, hasSilver: false },
  { slug: "mixed", name: "ترکیب", imageUrl: "/api/media/products/real-mixed", hasGold: true, hasSilver: true },
];

async function scenario({ intro = false, saveData = false, unavailable = false } = {}) {
  let observerCallback: any, catalogReady!: (result: unknown) => void;
  let fetchCalls = 0, now = 20000, pending = false;
  let fetchSignal: AbortSignal | undefined;
  const events = new Map<string, () => void>(), documentEvents = new Map<string, () => void>();
  const timers = new Map<number, () => void>(), intervals = new Map<number, () => void>();
  const navigations: string[] = [];
  const bays = ["gold", "silver", "weave"].map((treasury, index) => ({
    dataset: { treasury }, getBoundingClientRect: () => ({ top: index * 1000, bottom: index * 1000 + 400 }),
  }));
  const root = { querySelectorAll: () => bays, getBoundingClientRect: () => ({ bottom: 3000 }) };
  const sandboxModule = { exports: {} as any };
  runInNewContext(compile("src/components/home-palace/index.tsx"), {
    module: sandboxModule, exports: sandboxModule.exports, console, AbortController, Date: { now: () => now },
    navigator: { connection: { saveData } },
    document: {
      visibilityState: "visible", querySelector: () => intro ? {} : null,
      addEventListener: (name: string, fn: () => void) => documentEvents.set(name, fn),
      removeEventListener: (name: string) => documentEvents.delete(name),
    },
    window: {
      innerHeight: 700,
      addEventListener: (name: string, fn: () => void) => events.set(name, fn),
      removeEventListener: (name: string) => events.delete(name),
    },
    setTimeout: (fn: () => void) => { const id = timers.size + 1; timers.set(id, fn); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    setInterval: (fn: () => void) => { intervals.set(1, fn); return 1; },
    clearInterval: (id: number) => intervals.delete(id),
    IntersectionObserver: class { constructor(fn: any) { observerCallback = fn; } observe() {} disconnect() {} },
    fetch: (_url: string, options: { signal: AbortSignal }) => {
      fetchCalls++; fetchSignal = options.signal;
      return new Promise(resolve => { catalogReady = resolve; });
    },
    require: (name: string) => {
      if (name.endsWith(".css")) return {};
      if (name === "next/link") return { useLinkStatus: () => ({ pending }) };
      if (name === "./palace-products") return products;
      if (name === "./palace-entry") return { startPalaceEntry };
      if (name === "./palace-reference-assets.json") return assets;
      if (name === "@/components/product-image") return {
        ProductImage: ({ fill, ...props }: any) => { void fill; return React.createElement("img", props); },
      };
      if (name === "@/components/treasury-transition") return {
        TreasuryLink: ({ children, prefetch, showPending = true, ...props }: any) => {
          return React.createElement("a", {
            ...props, "data-pending-indicator": String(showPending), "data-prefetch": prefetch,
            onNavigate: (event: any) => {
              props.onNavigate?.(event);
              navigations.push(props.href);
            },
          }, children);
        },
      };
      return require(name);
    },
  });
  const Component = sandboxModule.exports.HomePalace;
  const html = renderToStaticMarkup(React.createElement(Component));
  for (const slug of ["gold", "silver", "weave"]) assert.ok(html.includes(`/fa/collections/${slug}`));
  assert.equal((html.match(/class="ep-enter"/g) || []).length, 3);
  assert.ok(!html.includes("/fa/products?q="), "Never invent a product/search destination");
  assert.ok(!html.includes("تصویر مرجع"));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Component), { createNodeMock: () => root }); });
  assert.equal(fetchCalls, 0, "Below-fold catalogue does not compete with the intro");
  await act(async () => observerCallback([{ target: root, isIntersecting: true }]));
  if (intro) {
    assert.equal(fetchCalls, 0);
    await act(async () => events.get("eloria:intro-complete")?.());
  }
  assert.equal(fetchCalls, 1);
  const entry = () => tree.root.findAll(node => node.type === "a" && node.props.className === "ep-enter")[0];
  assert.equal(entry().props["data-prefetch"], !saveData, "Visible treasury fully prefetches before tapping");
  const silverEntry = () => tree.root.findAll(node => node.type === "a" && node.props.className === "ep-enter")[1];
  assert.equal(silverEntry().props["data-prefetch"], false, "Offscreen treasuries wait for visibility or intent");
  await act(async () => silverEntry().props.onFocus());
  assert.equal(silverEntry().props["data-prefetch"], !saveData);
  assert.equal(entry().props["data-pending-indicator"], "false");
  await act(async () => entry().props.onNavigate({ preventDefault() { assert.fail("Entry must start immediately"); } }));
  assert.deepEqual(navigations, ["/fa/collections/gold"]);
  assert.deepEqual(bays.map(bay => (bay.dataset as any).open), ["true", "false", "false"]);
  assert.equal(tree.root.findByProps({ className: "ep-stage" }).props["data-open"], "gold");
  assert.equal(timers.size, 1, "Only the network timeout exists; no scene reset or route delay");
  const links = () => tree.root.findAll(node => node.type === "a" && node.props.className.startsWith("ep-featured-product"));
  assert.equal(links().length, 0, "Before data arrives, ornamental slots are not fake products");
  await act(async () => catalogReady({ ok: !unavailable, json: async () => ({ source: "database", items: catalogue }) }));
  assert.equal(timers.size, 0);
  if (unavailable) {
    assert.equal(links().length, 0);
    now += 16000;
    await act(async () => events.get("online")?.());
    assert.equal(fetchCalls, 2, "Network recovery retries unavailable previews");
    await act(async () => catalogReady({ ok: true, json: async () => ({ source: "database", items: catalogue }) }));
  }
  assert.equal(links().length, 4);
  for (const link of links()) {
    const image = link.findByType("img");
    const record = catalogue.find(p => p.imageUrl === image.props.src)!;
    assert.ok(record, "Only a catalogue product supplies the photograph");
    assert.equal(link.props.href, products.productHref(record));
    assert.equal(image.props.alt, record.name);
    assert.equal(link.props["data-pending-indicator"], "false");
  }
  for (const treasury of ["gold", "silver", "weave"] as const) {
    const bay = tree.root.findByProps({ "data-treasury": treasury });
    const thumbnails = bay.findAll(node => node.type === "a" && node.props.className.startsWith("ep-photo "));
    assert.deepEqual(thumbnails.map(node => node.props.href), products.treasuryProducts(catalogue, treasury).map(products.productHref));
    assert.ok(thumbnails.every(node => !node.props.href.includes("collections")));
  }
  // A slow navigation must leave the chest open after all unrelated timers.
  assert.equal(tree.root.findByProps({ className: "ep-stage" }).props["data-open"], "gold");
  pending = true; await act(async () => tree.update(React.createElement(Component)));
  pending = false; await act(async () => tree.update(React.createElement(Component)));
  assert.equal(tree.root.findByProps({ className: "ep-stage" }).props["data-open"], null, "Cancelled navigation recovers");
  await act(async () => entry().props.onNavigate({}));
  await act(async () => events.get("pageshow")?.());
  assert.equal(tree.root.findByProps({ className: "ep-stage" }).props["data-open"], null);
  await act(async () => tree.unmount());
  assert.equal(timers.size + intervals.size, 0);
  assert.ok(fetchSignal?.aborted);
  assert.equal(events.size + documentEvents.size, 0);
}

async function apiScenario() {
  const queries: any[] = [];
  const row = { ...catalogue[0], createdAt: new Date(), nameFa: "دلبر", nameEn: "Delbar", isFeatured: true, images: [{ imageUrl: catalogue[0].imageUrl }] };
  const sandboxModule = { exports: {} as any };
  runInNewContext(compile("src/app/api/treasury/preview/route.ts"), {
    module: sandboxModule, exports: sandboxModule.exports, URL, Date, Map,
    require: (name: string) => name === "next/server" ? { NextResponse: { json: (data: unknown) => data } }
      : { withDatabaseStatementTimeout: (_ms: number, fn: any) => fn({ product: { findMany: async (query: any) => { queries.push(query); return [row]; } } }) },
  });
  const response = await sandboxModule.exports.GET({ url: "https://eloriagallery.ir/api/treasury/preview?locale=fa" });
  assert.equal(response.items.length, 1, "Mixed/category/featured duplicates collapse to one record");
  assert.equal(response.items[0].imageUrl, row.images[0].imageUrl);
  assert.equal(response.items[0].isFeatured, true);
  assert.equal(queries.length, 4);
  assert.equal(queries[3].where.isFeatured, true);
  assert.equal(queries[3].take, 8, "All eight featured products can come from the same treasury");
  for (const query of queries) {
    assert.deepEqual(Array.from(query.where.status.in), ["ACTIVE", "OUT_OF_STOCK"]);
    assert.equal(query.where.collection.isActive, true);
    assert.equal(query.select.images.orderBy[0].isPrimary, "desc");
  }
}

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  assert.equal(products.readPalaceProducts([...catalogue, catalogue[0], { ...catalogue[0], slug: "bad", imageUrl: "javascript:alert(1)" }, { slug: "no-photo", name: "بدون عکس" }]).length, 4);
  const selected = products.featuredProducts(catalogue.map((p, i) => ({ ...p, isFeatured: i === 3 })));
  assert.equal(selected[0]?.slug, "mixed", "A short featured list still starts in the first mobile slot");
  assert.equal(selected.filter(Boolean).length, 4, "Spare slots use other real products");
  assert.equal(products.treasuryProducts(catalogue, "weave").length, 1);
  await scenario(); await scenario({ intro: true }); await scenario({ unavailable: true }); await scenario({ saveData: true });
  await apiScenario();
  // The existing frame and scene binaries are reused without replacements.
  for (const art of [assets.desktop, assets.featured, assets.brazier, ...Object.values(assets.mobile).flatMap(p => Object.values(p)), ...Object.values(assets.opened)]) {
    for (const variant of art.variants) assert.ok(existsSync(`public${variant.url}`));
  }
  console.log("PASS: real product/photo/direct-link identity, treasury membership, admin selections, safe empty/outage/retry states, immediate entry, no timed scene reset, cancelled/back navigation, visible-route prefetch and Save-Data.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
