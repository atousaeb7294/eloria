/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated browser doubles for the actual palace component. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import assets from "../src/components/home-palace/palace-photo-assets.json";

async function scenario(mobile: boolean, intro = false) {
  const require = createRequire(import.meta.url);
  let observerCallback: any;
  const events = new Map<string, () => void>();
  let runtimeLoads = 0, fetchCalls = 0;
  let catalogReady!: (result: unknown) => void;

  const prefetches: string[] = [];
  const router = { prefetch: (href: string) => prefetches.push(href), push: (href: string) => { navigations.push(href); } };
  const navigations: string[] = [];
  const timers = new Map();
  const root = { dataset: {}, dispatchEvent() {} };
  const mod = { exports: {} as any };
  const compiled = ts.transpileModule(readFileSync("src/components/home-palace/index.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(compiled, {
    module: mod, exports: mod.exports, console, AbortController, Event, CustomEvent: class { constructor(public type: string, public options: unknown) {} },
    document: { querySelector: () => intro ? {} : null },
    navigator: { connection: {} },
    window: { matchMedia: (query: string) => ({ matches: query.includes("max-width") && mobile }), addEventListener(name: string, fn: () => void) { events.set(name, fn); }, removeEventListener(name: string) { events.delete(name); }, dispatchEvent() {} },
    setTimeout: (fn: any) => { const id = timers.size + 1; timers.set(id, fn); return id; }, clearTimeout: (key: number) => timers.delete(key),
    IntersectionObserver: class { constructor(fn: any) { observerCallback = fn; } observe() {} disconnect() {} },
    fetch: () => { fetchCalls++; return new Promise(resolve => { catalogReady = resolve; }); },
    require: (name: string) => {
      if (name.endsWith(".css")) return {};
      if (name === "next/navigation") return { useRouter: () => router };
      if (name === "@/components/treasury-transition") return { TreasuryLink: ({ children, prefetch, ...props }: any) => { void prefetch; return React.createElement("a", {...props, onNavigate: (event: any) => {let cancelled=false;props.onNavigate?.({preventDefault(){cancelled=true;event.preventDefault();}});if(!cancelled)navigations.push(props.href);}}, children); } };
      if (name === "@/components/product-image") return { ProductImage: ({ fill, ...props }: any) => { void fill; return React.createElement("img", props); } };
      if (name === "./palace-runtime") { runtimeLoads++; return { mountHomePalace: (_root: any, options: any) => { void options; return () => {}; } }; }
      if (name === "./palace-markup") return require("../src/components/home-palace/palace-markup.ts");
      if (name === "./palace-photo-assets.json") return assets;
      return require(name);
    },
  });
  const Component = mod.exports.HomePalace;
  const html = renderToStaticMarkup(React.createElement(Component));
  assert.ok(html.includes("گنجینهٔ طلا") && html.includes("گنجینهٔ نقره") && html.includes("گنجینهٔ بافت"));
  assert.ok(html.includes('/fa/collections/gold'), "Entry links must exist before JS or database results");
  assert.ok(html.includes("منتخب‌های الوریا"));
  assert.equal((html.match(/class="ep-chest-target /g) || []).length, 3);
  assert.ok(!html.includes("<dialog"), "Treasury entry must use existing routes, not a dialog");
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Component), { createNodeMock: () => root }); });
  assert.equal(fetchCalls, 0, "Below-fold data must not compete with intro");
  await act(async () => observerCallback([{ isIntersecting: true }]));
  if (intro) {
    assert.equal(fetchCalls, 0);
    await act(async () => events.get("eloria:intro-complete")?.());
  }
  assert.equal(fetchCalls, 1);
  assert.equal(runtimeLoads, 0, "Neither viewport should need Three.js for entry");
  assert.equal(tree.root.findAll(node => node.type === "a" && node.props.className === "ep-enter").length, 3);

  navigations.length = 0;
  let prevented = 0;
  const entry = tree.root.findAll(node => node.type === "a" && node.props.className === "ep-enter")[0];
  await act(async () => {
    entry.props.onNavigate({ preventDefault() { prevented++; } });
    entry.props.onNavigate({ preventDefault() { prevented++; } });
  });
  assert.equal(prevented, 1, "First click must use native navigation; only duplicate click is cancelled");
  assert.equal(tree.root.findByProps({className: "ep-stage"}).props["data-open"], "gold");
  assert.deepEqual(navigations, ["/fa/collections/gold"], "Navigation must start in the click event, before any animation timer or catalog response");
  assert.equal(timers.size, 2, "Only pending catalog timeout and duplicate-click recovery exist");
  entry.props.onPointerEnter();entry.props.onFocus();
  assert.deepEqual(prefetches,["/fa/collections/gold"],"Intent prefetch is deduplicated");
  await act(async () => catalogReady({ ok: true, json: async () => ({ items: [{slug:"gold-item",name:"اثر طلا",imageUrl:"/images/test.webp",hasGold:true,hasSilver:false}] }) }));
  assert.equal(tree.root.findAll(node => node.type === "a" && node.props.className === "ep-photo").length, 1);
  for (const panel of tree.root.findAllByProps({className:"ep-flag-content"})) {
    assert.equal(panel.findAllByProps({className:"ep-card-title font-persian-title"}).length, 1);
    assert.equal(panel.findAll(node => node.type === "a" && node.props.className === "ep-enter").length, 1);
    assert.equal(panel.findAllByProps({className:"ep-photos"}).length, 1);
  }
  assert.equal(tree.root.findAll(node => node.type === "a" && node.props.className === "ep-featured-product").length, 1);
  assert.equal(timers.size, 1, "Catalog completion clears its timeout");
  await act(async () => { for (const [id, fn] of [...timers]) { timers.delete(id); fn(); } });
  assert.deepEqual(navigations, ["/fa/collections/gold"]);
  await act(async () => tree.unmount());
  assert.equal(timers.size, 0);

}

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await scenario(true);
  await scenario(true, true);
  await scenario(false);
  for (const list of Object.values(assets)) for (const variant of list) assert.ok(existsSync(`public${variant.url}`));
  const home = readFileSync("src/app/[locale]/page.tsx", "utf8");
  assert.ok(home.indexOf("<HeroShowcase locale=") < home.indexOf("<HomePalace"), "Keep palace below existing hero");
  assert.match(readFileSync("next.config.ts", "utf8"), /qualities:[^\n]*92/, "Requested product quality must be allowed");
  const runtime = readFileSync("src/components/home-palace/palace-runtime.js", "utf8");
  assert.doesNotMatch(runtime, /animatePalace|setTimeout|moveIntoChest|advanceFlight/);
  const css = readFileSync("src/components/home-palace/palace.css", "utf8");
  assert.doesNotMatch(css, /@font-face|EloriaNastaliq/);
  assert.match(css, /Vazirmatn/);
  assert.match(css, /\.ep-chest-target\{[^}]*left:var\(--ep-center\)/, "Chest uses the shared axis");
  assert.match(css, /\.ep-treasury\{[^}]*left:var\(--ep-center\)/, "Banner uses the shared axis");
  assert.match(css, /\.ep-featured\{[^}]*position:relative;[^}]*height:auto/, "Featured frame must grow with content");
  assert.match(css, /\.ep-flag-content\{[^}]*display:flex/, "Banner content must have its own flow container");
  assert.match(css, /\.ep-chest-scene\{[^}]*position:relative/, "Chest and rug use a separate scene below banner");
  console.log("PASS home photo: existing route links, lazy live catalog, no Three.js or modal, instant native navigation, deduplicated intent prefetch, featured products and timer cleanup");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
