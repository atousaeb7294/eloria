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
import * as scene from "../src/components/home-palace/palace-scene";
import { LIDS, openingAngle, projectWorld, MAX_LID_ANGLE, lidVertex } from "../src/components/home-palace/palace-hinge";

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

async function scenario({ intro = false, saveData = false, unavailable = false, reduced = false, artworkUnavailable = false } = {}) {
  let observerCallback: any, catalogReady!: (result: unknown) => void;
  let fetchCalls = 0, now = 20000, nextTimer = 1;
  let fetchSignal: AbortSignal | undefined;
  const events = new Map<string, (event?: any) => void>(), documentEvents = new Map<string, () => void>();
  const timers = new Map<number, { fn: () => void; ms: number }>(), intervals = new Map<number, () => void>();
  const navigations: string[] = [];
  const bays = ["gold", "silver", "weave"].map((treasury, index) => ({
    dataset: { treasury, treasuryTarget: treasury }, getBoundingClientRect: () => ({ top: index * 1000, bottom: index * 1000 + 400 }),
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
      if (name === "./palace-scene") return scene;
      if (name === "./palace-scene-motion") return { createChestMotion: () => ({ warm() {}, open: () => !artworkUnavailable, reset() {}, destroy() {} }) };
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

  }
  assert.equal((html.match(/class="ep-enter"/g) || []).length, 3);
  assert.ok(html.includes(scene.SCENES.desktop.src) && html.includes(scene.SCENES.mobile.src), "Both COMPLETE references have art-directed picture sources");
  assert.equal((html.match(/data-product-slot="true"/g) || []).length, 18, "All nine preview and nine featured frames are opaque before hydration");
  assert.equal((html.match(/data-product-present="false"/g) || []).length, 18, "No invented products during loading");
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
  const featured = () => tree.root.findAll(node => node.type === "a" && node.props.className === "ep-featured-product" && node.props["data-product-present"]);
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
    assert.equal(image.props["data-original"], "false", "Local previews use responsive Next image variants without changing source files");
    assert.equal(image.props.quality, 92);
  }
  for (const treasury of ["gold", "silver", "weave"] as const) {
    const thumbnails = tree.root.findByProps({ "data-treasury": treasury }).findAll(node => node.type === "a" && node.props.className === "ep-photo" && node.props["data-product-present"]);
    assert.deepEqual(thumbnails.map(node => node.props.href), products.treasuryProducts(catalogue, treasury).map(p => products.productHref(p)));
  }
  const openingTimers = () => [...timers].filter(([, timer]) => timer.ms === entry.PALACE_OPENING_MS);
  for (const [index, slug] of ["gold", "silver", "weave"].entries()) {
    await act(async () => entries()[index].props.onNavigate());
    assert.equal(navigations.at(-1), `/fa/collections/${slug}`, "Every click follows its destination immediately");
    assert.equal(openingTimers().length, 0, "Navigation never waits for an animation");
  }
  await act(async () => featured()[0].props.onNavigate());
  assert.equal(navigations.at(-1), featured()[0].props.href);
  for (const event of ["pageshow", "popstate", "keydown"]) {
    await act(async () => events.get(event)?.({ key: "Escape" }));
    assert.equal(openingTimers().length, 0, "No stale redirect after back, escape or another link");
  }
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
  await scenario({ saveData: true }); await scenario({ reduced: true }); await scenario({ artworkUnavailable: true }); await apiScenario();
  for (const slug of ["gold", "silver", "weave"]) assert.ok(existsSync(`public/images/palace/royal-20261019/${slug}.jpg`));
  const originals = JSON.parse(readFileSync("docs/royal-treasuries-assets.json", "utf8")) as Array<{ path: string; sha256: string }>;
  for (const original of originals) assert.equal(createHash("sha256").update(readFileSync(original.path)).digest("hex"), original.sha256, "The uploaded image bytes must remain unchanged");
  const sceneAssets = JSON.parse(readFileSync("docs/royal-complete-scene-assets.json", "utf8")) as Array<{ path: string; sha256: string }>;
  for (const original of sceneAssets) assert.equal(createHash("sha256").update(readFileSync(original.path)).digest("hex"), original.sha256);
  for (const mode of ["desktop", "mobile"] as const) {
    for (const frame of [...Object.values(scene.CHEST_FRAMES), ...Object.values(scene.ENTRY_FRAMES), ...Object.values(scene.PREVIEW_FRAMES).flat(), ...scene.FEATURED_FRAMES]) {
      const [x,y,w,h] = frame[mode], {width,height} = scene.SCENES[mode];
      assert.ok(x >= 0 && y >= 0 && w > 0 && h > 0 && x+w <= width && y+h <= height, "Hotspots stay inside their complete reference canvas");
    }
    for (const lid of Object.values(LIDS[mode])) {
      for (const angle of [0, .4, 1, MAX_LID_ANGLE]) assert.deepEqual(projectWorld(lid,lid.rear[0],0,0,angle),lid.rear,"The rear hinge must never drift");
      for (const p of lid.outline) {
        const initial=lidVertex(lid,p,0);assert.ok(Math.abs(initial[0]-p[0])<1e-7&&Math.abs(initial[1]-p[1])<1e-7,"The closed lid exactly registers with the original picture");
      }
    }
  }
  let previous=0;
  for(let ms=0;ms<=entry.PALACE_OPENING_MS;ms+=10){const angle=openingAngle(ms);assert.ok(angle>=previous&&angle<=MAX_LID_ANGLE);previous=angle;}
  const css=readFileSync("src/components/home-palace/palace.css","utf8");
  assert.ok(css.includes("object-fit:cover")&&css.includes("padding:0"));
  assert.ok(css.includes("aspect-ratio:1584/993")&&css.includes("aspect-ratio:850/1850"));
  console.log("PASS: product/photo/link identity; manual selections and order; three immediate treasury destinations; rapid/back/product navigation; reduced motion; original images; empty/outage/retry states; prefetch and Save-Data. Database and browser are mocked.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
