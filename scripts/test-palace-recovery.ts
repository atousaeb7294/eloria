/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated UI and database doubles. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import * as products from "../src/components/home-palace/palace-products";
import * as entry from "../src/components/home-palace/palace-entry";

const require = createRequire(import.meta.url);
function compile(file: string) {
  return ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
}
const catalogue = [
  { slug: "gold/دلبر", name: "دلبر", imageUrl: "/api/media/products/real-delbar", hasGold: true, hasSilver: false, displayOrder: 20, isFeatured: true },
  { slug: "silver", name: "نقره ماه", imageUrl: "/api/media/products/real-silver", hasGold: false, hasSilver: true, displayOrder: 3, isFeatured: true },
  { slug: "weave", name: "مینای شب", imageUrl: "/api/media/products/real-weave", hasGold: false, hasSilver: false, displayOrder: 4, isFeatured: false },
  { slug: "mixed", name: "ترکیب", imageUrl: "/api/media/products/real-mixed", hasGold: true, hasSilver: true, displayOrder: 1, isFeatured: true },
];

async function scenario({ intro = false, saveData = false, unavailable = false, reduced = false } = {}) {
  let observerCallback: any, catalogReady!: (result: unknown) => void;
  let fetchCalls = 0, now = 20000, nextTimer = 1;
  let fetchSignal: AbortSignal | undefined;
  const events = new Map<string, (event?: any) => void>(), documentEvents = new Map<string, () => void>();
  const timers = new Map<number, { fn: () => void; ms: number }>(), intervals = new Map<number, () => void>();
  const navigations: string[] = [];
  const bays = ["gold", "silver", "weave"].map((treasury, index) => ({
    dataset: { treasury }, getBoundingClientRect: () => ({ top: index * 1000, bottom: index * 1000 + 400 }),
  }));
  const root = { querySelectorAll: () => bays };
  const sandboxModule = { exports: {} as any };
  const ImageDouble = ({ fill, unoptimized, ...props }: any) => {
    void fill;
    return React.createElement("img", { ...props, "data-original": String(unoptimized) });
  };
  runInNewContext(compile("src/components/home-palace/index.tsx"), {
    module: sandboxModule, exports: sandboxModule.exports, console, AbortController, Event, Date: { now: () => now },
    navigator: { connection: { saveData } },
    document: {
      visibilityState: "visible", querySelector: () => intro ? {} : null,
      addEventListener: (name: string, fn: () => void) => documentEvents.set(name, fn),
      removeEventListener: (name: string) => documentEvents.delete(name),
    },
    window: {
      innerHeight: 700, matchMedia: () => ({ matches: reduced }),
      dispatchEvent: (event: Event) => events.get(event.type)?.(event),
      addEventListener: (name: string, fn: () => void) => events.set(name, fn),
      removeEventListener: (name: string) => events.delete(name),
    },
    setTimeout: (fn: () => void, ms: number) => { const id = nextTimer++; timers.set(id, { fn, ms }); return id; },
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
      if (name === "next/image") return { __esModule: true, default: ImageDouble };
      if (name === "next/navigation") return { useRouter: () => ({ push: (href: string) => navigations.push(href) }) };
      if (name === "./palace-products") return products;
      if (name === "./palace-entry") return entry;
      if (name === "@/components/product-image") return { ProductImage: ImageDouble };
      if (name === "@/components/treasury-transition") return {
        TreasuryLink: ({ children, prefetch, showPending, ...props }: any) => {
          void showPending;
          return React.createElement("a", {
            ...props, "data-prefetch": prefetch,
            onNavigate: () => {
              let cancelled = false;
              props.onNavigate?.({ preventDefault: () => { cancelled = true; } });
              if (!cancelled) { events.get("eloria:navigate")?.(); navigations.push(props.href); }
            },
          }, children);
        },
      };
      return require(name);
    },
  });
  const Component = sandboxModule.exports.HomePalace;
  const html = renderToStaticMarkup(React.createElement(Component));
  for (const slug of ["gold", "silver", "weave"]) {
    assert.ok(html.includes(`/fa/collections/${slug}`), "SSR retains native destinations without JavaScript");
    assert.ok(html.includes(`/royal-20261019/${slug}.jpg`));
  }
  assert.equal((html.match(/class="ep-enter"/g) || []).length, 3);
  assert.ok(!html.includes("/images/palace/reference/"), "Old baked-in jewellery is never rendered, even on failure");
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Component), { createNodeMock: () => root }); });
  assert.equal(fetchCalls, 0, "Below-fold catalogue does not compete with the existing intro");
  await act(async () => observerCallback([{ target: root, isIntersecting: true }]));
  if (intro) {
    assert.equal(fetchCalls, 0);
    await act(async () => events.get("eloria:intro-complete")?.());
  }
  assert.equal(fetchCalls, 1);
  const entries = () => tree.root.findAll(node => node.type === "a" && node.props.className === "ep-enter");
  assert.equal(entries()[0].props["data-prefetch"], !saveData);
  assert.equal(entries()[1].props["data-prefetch"], false);
  await act(async () => entries()[1].props.onFocus());
  assert.equal(entries()[1].props["data-prefetch"], !saveData);
  const featured = () => tree.root.findAll(node => node.type === "a" && node.props.className === "ep-featured-product");
  assert.equal(featured().length, 0);
  await act(async () => catalogReady({ ok: !unavailable, json: async () => ({ source: "database", items: catalogue }) }));
  if (unavailable) {
    assert.equal(featured().length, 0);
    now += 16000;
    await act(async () => events.get("online")?.());
    assert.equal(fetchCalls, 2);
    await act(async () => catalogReady({ ok: true, json: async () => ({ source: "database", items: catalogue }) }));
  }
  assert.equal(featured().length, 3, "Unselected products cannot fill curated slots");
  assert.deepEqual(featured().map(link => link.props.href), products.featuredProducts(catalogue).map(p => products.productHref(p)));
  for (const link of featured()) {
    const image = link.findByType("img");
    const record = catalogue.find(p => p.imageUrl === image.props.src)!;
    assert.ok(record);
    assert.equal(link.props.href, products.productHref(record));
    assert.equal(image.props.alt, record.name);
    assert.equal(image.props["data-original"], "true");
  }
  for (const treasury of ["gold", "silver", "weave"] as const) {
    const thumbnails = tree.root.findByProps({ "data-treasury": treasury }).findAll(node => node.type === "a" && node.props.className === "ep-photo");
    assert.deepEqual(thumbnails.map(node => node.props.href), products.treasuryProducts(catalogue, treasury).map(p => products.productHref(p)));
  }
  const openingTimers = () => [...timers].filter(([, timer]) => timer.ms === entry.PALACE_OPENING_MS);
  const finishOpening = async () => {
    const [id, timer] = openingTimers()[0]; timers.delete(id);
    await act(async () => timer.fn());
  };
  await act(async () => entries()[0].props.onNavigate());
  if (reduced) {
    assert.deepEqual(navigations, ["/fa/collections/gold"]);
    assert.equal(openingTimers().length, 0, "Reduced-motion navigation is immediate");
  } else {
    assert.deepEqual(navigations, [], "Fast prefetched routes must wait for the lid to open");
    assert.equal(tree.root.findByProps({ className: "ep-stage" }).props["data-open"], "gold");
    await act(async () => entries()[1].props.onNavigate());
    assert.equal(openingTimers().length, 1, "Rapid clicks cancel the obsolete destination");
    await finishOpening();
    assert.deepEqual(navigations, ["/fa/collections/silver"]);
    for (const slugIndex of [0, 1, 2]) {
      await act(async () => entries()[slugIndex].props.onNavigate());
      await finishOpening();
      assert.equal(navigations.at(-1), `/fa/collections/${["gold", "silver", "weave"][slugIndex]}`);
    }
    await act(async () => entries()[0].props.onNavigate());
    await act(async () => featured()[0].props.onNavigate());
    assert.equal(openingTimers().length, 0, "A direct product click cancels a delayed treasury route");
    assert.equal(navigations.at(-1), featured()[0].props.href);
    for (const event of ["pageshow", "popstate", "keydown"]) {
      await act(async () => entries()[0].props.onNavigate());
      await act(async () => events.get(event)?.({ key: "Escape" }));
      assert.equal(openingTimers().length, 0);
      assert.equal(tree.root.findByProps({ className: "ep-stage" }).props["data-open"], null);
    }
  }
  await act(async () => entries()[0].props.onNavigate());
  await act(async () => tree.unmount());
  assert.equal(timers.size + intervals.size, 0);
  assert.ok(fetchSignal?.aborted);
  assert.equal(events.size + documentEvents.size, 0);
}

async function apiScenario() {
  const queries: any[] = [];
  const rows = catalogue.map((p, index) => ({ ...p, id: String(index), createdAt: new Date(2026, 0, index + 1), nameFa: p.name, nameEn: `English ${p.name}`, images: [{ imageUrl: p.imageUrl }] }));
  const sandboxModule = { exports: {} as any };
  runInNewContext(compile("src/app/api/treasury/preview/route.ts"), {
    module: sandboxModule, exports: sandboxModule.exports, URL, Date, Map,
    require: (name: string) => name === "next/server" ? { NextResponse: { json: (data: unknown) => data } }
      : { withDatabaseStatementTimeout: (_ms: number, fn: any) => fn({ product: { findMany: async (query: any) => { queries.push(query); return rows; } } }) },
  });
  const response = await sandboxModule.exports.GET({ url: "https://eloriagallery.ir/api/treasury/preview?locale=fa" });
  assert.equal(response.items.length, 4, "Mixed/category/featured duplicates collapse to one record");
  assert.deepEqual(Array.from(response.items, (p: any) => p.slug), ["mixed", "silver", "weave", "gold/دلبر"], "Admin order takes precedence over age and hard-coded names");
  assert.equal(queries.length, 4);
  assert.equal(queries[3].where.isFeatured, true);
  assert.equal(queries[3].take, 9, "All nine curated products can come from one treasury");
  for (const query of queries) {
    assert.deepEqual(Array.from(query.where.status.in), ["ACTIVE", "OUT_OF_STOCK"]);
    assert.equal(query.where.collection.isActive, true);
    assert.equal(query.select.images.orderBy[0].isPrimary, "desc");
    assert.equal(query.orderBy[0].displayOrder, "asc");
  }
}

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  assert.equal(products.readPalaceProducts([...catalogue, catalogue[0], { ...catalogue[0], slug: "bad", imageUrl: "javascript:alert(1)" }, { slug: "no-photo", name: "بدون عکس" }]).length, 4);
  assert.equal(products.featuredProducts(catalogue.map(p => ({ ...p, isFeatured: false }))).length, 4, "An unconfigured store starts with real catalogue products");
  assert.equal(products.featuredProducts(catalogue.map((p, index) => ({ ...p, isFeatured: index === 2 }))).length, 1, "A manual selection is never padded");
  assert.equal(products.treasuryProducts(catalogue, "weave").length, 1);
  assert.equal(products.treasuryProducts(catalogue, "gold")[0].slug, "mixed");
  assert.equal(products.productHref(catalogue[0]), "/fa/products/gold%2F%D8%AF%D9%84%D8%A8%D8%B1");
  const many = Array.from({ length: 12 }, (_, i) => ({ ...catalogue[0], slug: `selected-${i}`, displayOrder: i }));
  assert.equal(products.featuredProducts(many).length, 9);
  await scenario(); await scenario({ intro: true }); await scenario({ unavailable: true });
  await scenario({ saveData: true }); await scenario({ reduced: true }); await apiScenario();
  for (const slug of ["gold", "silver", "weave"]) assert.ok(existsSync(`public/images/palace/royal-20261019/${slug}.jpg`));
  const originals = JSON.parse(readFileSync("docs/royal-treasuries-assets.json", "utf8")) as Array<{ path: string; sha256: string }>;
  for (const original of originals) assert.equal(createHash("sha256").update(readFileSync(original.path)).digest("hex"), original.sha256, "The uploaded image bytes must remain unchanged");
  console.log("PASS: product/photo/link identity; manual selections and order; three treasury destinations after opening; cancelled/rapid/back/product navigation; reduced motion; original images; empty/outage/retry states; prefetch and Save-Data. Database and browser are mocked.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
