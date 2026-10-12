/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated browser doubles for the actual palace component. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import assets from "../src/components/home-palace/palace-assets.json";

async function scenario(mobile: boolean, intro = false) {
  const require = createRequire(import.meta.url);
  let observerCallback: any;
  const events = new Map<string, () => void>();
  let runtimeLoads = 0, fetchCalls = 0, disposed = false;
  let catalogReady!: (result: unknown) => void;
  let sceneOptions: any;
  const router = { push: (href: string) => { navigations.push(href); } };
  const navigations: string[] = [];
  const timers = new Map();
  const root = { dataset: {} };
  const mod = { exports: {} as any };
  const compiled = ts.transpileModule(readFileSync("src/components/home-palace/index.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(compiled, {
    module: mod, exports: mod.exports, console, AbortController, Event,
    document: { querySelector: () => intro ? {} : null },
    navigator: { connection: {} },
    window: { matchMedia: () => ({ matches: mobile }), addEventListener(name: string, fn: () => void) { events.set(name, fn); }, removeEventListener(name: string) { events.delete(name); }, dispatchEvent() {} },
    setTimeout: (fn: any) => { timers.set(1, fn); return 1; }, clearTimeout: (key: number) => timers.delete(key),
    IntersectionObserver: class { constructor(fn: any) { observerCallback = fn; } observe() {} disconnect() {} },
    fetch: () => { fetchCalls++; return new Promise(resolve => { catalogReady = resolve; }); },
    require: (name: string) => {
      if (name.endsWith(".css")) return {};
      if (name === "next/navigation") return { useRouter: () => router };
      if (name === "@/components/treasury-transition") return { TreasuryLink: ({ children, ...props }: any) => React.createElement("a", props, children) };
      if (name === "@/components/product-image") return { ProductImage: ({ fill, ...props }: any) => { void fill; return React.createElement("img", props); } };
      if (name === "./palace-runtime") { runtimeLoads++; return { mountHomePalace: (_root: any, options: any) => { sceneOptions = options; return () => { disposed = true; }; } }; }
      if (name === "./palace-markup") return require("../src/components/home-palace/palace-markup.ts");
      if (name === "./palace-assets.json") return assets;
      return require(name);
    },
  });
  const Component = mod.exports.HomePalace;
  const html = renderToStaticMarkup(React.createElement(Component));
  assert.ok(html.includes("گنجینهٔ طلا") && html.includes("گنجینهٔ نقره") && html.includes("گنجینهٔ بافت"));
  assert.ok(html.includes('/fa/collections/gold'), "Entry links must exist before JS or database results");
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Component), { createNodeMock: () => root }); });
  assert.equal(fetchCalls, 0, "Below-fold data must not compete with intro");
  await act(async () => observerCallback([{ isIntersecting: true }]));
  if (intro) {
    assert.equal(fetchCalls, 0);
    await act(async () => events.get("eloria:intro-complete")?.());
  }
  assert.equal(fetchCalls, 1);
  assert.equal(runtimeLoads, mobile ? 0 : 1, "Mobile must not import the 3D engine; desktop must not wait for API");
  assert.equal(tree.root.findAll(node => node.type === "a" && node.props.className === "ep-enter").length, 3);
  if (!mobile) { sceneOptions.navigateToTreasury("gold"); assert.deepEqual(navigations, ["/fa/collections/gold"]); }
  await act(async () => catalogReady({ ok: true, json: async () => ({ items: [{slug:"gold-item",name:"اثر طلا",imageUrl:"/images/test.webp",hasGold:true,hasSilver:false}] }) }));
  assert.equal(tree.root.findAll(node => node.type === "a" && node.props.className === "ep-photo").length, 1);
  await act(async () => tree.unmount());
  assert.equal(timers.size, 0);
  if (!mobile) assert.equal(disposed, true);
}

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await scenario(true);
  await scenario(true, true);
  await scenario(false);
  for (const list of Object.values(assets)) for (const variant of list) assert.ok(existsSync(`public${variant.url}`));
  const runtime = readFileSync("src/components/home-palace/palace-runtime.js", "utf8");
  assert.doesNotMatch(runtime, /animatePalace|setTimeout|moveIntoChest|advanceFlight/);
  const css = readFileSync("src/components/home-palace/palace.css", "utf8");
  assert.doesNotMatch(css, /@font-face|EloriaNastaliq/);
  assert.match(css, /Vazirmatn/);
  console.log("PASS palace: SSR entry links, independent catalog loading, no mobile Three.js, immediate navigation callback, cleanup and optimized assets");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
