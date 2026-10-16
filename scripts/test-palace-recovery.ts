/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated browser doubles. */
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import assets from "../src/components/home-palace/palace-reference-assets.json";

const require = createRequire(import.meta.url);
function compile(file: string) {
  return ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
}

async function scenario({ mobile = false, intro = false, saveData = false, unavailable = false } = {}) {
  let observerCallback: any, catalogReady!: (result: unknown) => void;
  let fetchCalls = 0;
  let fetchSignal: AbortSignal | undefined;
  const events = new Map<string, () => void>();
  const timers = new Map<number, () => void>();
  const prefetches: string[] = [], navigations: string[] = [], trace: string[] = [];
  const router = { prefetch: (href: string) => prefetches.push(href) };
  const module = { exports: {} as any };
  runInNewContext(compile("src/components/home-palace/index.tsx"), {
    module, exports: module.exports, console, AbortController,
    navigator: { connection: { saveData } },
    document: { querySelector: () => intro ? {} : null },
    window: {
      matchMedia: (q: string) => ({ matches: q.includes("max-width") && mobile }),
      addEventListener: (name: string, fn: () => void) => events.set(name, fn),
      removeEventListener: (name: string) => events.delete(name),
    },
    setTimeout: (fn: () => void) => { const id = timers.size + 1; timers.set(id, fn); return id; },
    clearTimeout: (id: number) => timers.delete(id),
    IntersectionObserver: class { constructor(fn: any) { observerCallback = fn; } observe() {} disconnect() {} },
    fetch: (_url: string, options: { signal: AbortSignal }) => {
      fetchCalls++; fetchSignal = options.signal;
      return new Promise(resolve => { catalogReady = resolve; });
    },
    require: (name: string) => {
      if (name.endsWith(".css")) return {};
      if (name === "next/navigation") return { useRouter: () => router };
      if (name === "./palace-entry") return { startPalaceEntry: () => trace.push("scene") };
      if (name === "./palace-reference-assets.json") return assets;
      if (name === "@/components/treasury-transition") return {
        TreasuryLink: ({ children, prefetch, showPending = true, ...props }: any) => {
          void prefetch;
          return React.createElement("a", {
            ...props, "data-pending-indicator": String(showPending),
            onNavigate: (event: any) => {
              let cancelled = false;
              props.onNavigate?.({ preventDefault() { cancelled = true; event.preventDefault(); } });
              if (!cancelled) { navigations.push(props.href); trace.push("navigate"); }
            },
          }, children);
        },
      };
      return require(name);
    },
  });
  const Component = module.exports.HomePalace;
  const html = renderToStaticMarkup(React.createElement(Component));
  for (const slug of ["gold", "silver", "weave"]) assert.ok(html.includes(`/fa/collections/${slug}`));
  assert.equal((html.match(/class="ep-enter"/g) || []).length, 3);
  assert.equal((html.match(/class="ep-chest-target /g) || []).length, 3);
  assert.ok(html.includes("منتخب‌های الوریا") && html.includes("دلبر"));
  assert.ok(html.includes("<picture") && html.includes('loading="lazy"'), "Photos exist before hydration or API data");
  assert.ok(!html.includes("<dialog"));
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Component), { createNodeMock: () => ({}) }); });
  assert.equal(fetchCalls, 0, "Below-fold catalogue does not compete with the intro");
  await act(async () => observerCallback([{ isIntersecting: true }]));
  if (intro) {
    assert.equal(fetchCalls, 0);
    await act(async () => events.get("eloria:intro-complete")?.());
  }
  assert.equal(fetchCalls, 1);
  const entries = tree.root.findAll(node => node.type === "a" && node.props.className === "ep-enter");
  for (const entry of entries) assert.equal(entry.props["data-pending-indicator"], "false", "Entry has no intermediary loading toast");
  let prevented = 0;
  await act(async () => {
    entries[0].props.onNavigate({ preventDefault() { prevented++; } });
    entries[0].props.onNavigate({ preventDefault() { prevented++; } });
  });
  assert.equal(prevented, 1, "Only duplicate navigation is cancelled");
  assert.deepEqual(navigations, ["/fa/collections/gold"], "Routing starts in the click event, before timers or API completion");
  assert.deepEqual(trace, ["scene", "navigate"]);
  assert.equal(tree.root.findByProps({ className: "ep-stage" }).props["data-open"], "gold");
  entries[0].props.onPointerEnter(); entries[0].props.onFocus(); entries[0].props.onPointerDown();
  assert.deepEqual(prefetches, saveData ? [] : ["/fa/collections/gold"]);
  const products = () => tree.root.findAll(node => node.type === "a" && node.props.className.startsWith("ep-featured-product"));
  const before = products().map(node => node.props.href);
  assert.ok(before.every(href => href.startsWith("/fa/products?q=")), "No invented product slugs before catalogue data");
  await act(async () => catalogReady({ ok: !unavailable, json: async () => ({ items: [
    { slug: "actual-delbar", name: "دلبَر", imageUrl: "/images/different-photo.webp" },
    { slug: "unrelated", name: "اثر دیگری" },
  ] }) }));
  assert.equal(products().length, 8, "Exactly the eight reference selections remain on desktop");
  assert.equal(products()[0].props.href, unavailable ? before[0] : "/fa/products/actual-delbar");
  assert.ok(!JSON.stringify(tree.toJSON()).includes("different-photo.webp"), "Live data cannot replace the requested reference photographs");
  assert.equal(timers.size, 1, "Catalogue timeout is released");
  await act(async () => events.get("pageshow")?.());
  assert.equal(tree.root.findByProps({ className: "ep-stage" }).props["data-open"], null);
  await act(async () => tree.unmount());
  assert.equal(timers.size, 0);
  assert.ok(fetchSignal?.aborted);
  assert.equal(events.size, 0);
}

function motionScenario(mobile: boolean) {
  let reduced = false, removed = 0, appended = 0;
  const timers = new Map<number, () => void>();
  const listeners = new Map<string, () => void>();
  const frameEvents = new Map<string, (event: any) => void>();
  const clones = ["gold", "silver", "weave"].map(slug => ({ dataset: { treasury: slug, open: "false" } }));
  const ids: string[] = [], links: string[] = [];
  const clone = {
    dataset: { open: "false" },
    removeAttribute: (name: string) => ids.push(name),
    querySelectorAll: (selector: string) => selector === "[id]" ? [{ removeAttribute: (name: string) => ids.push(name) }]
      : selector === "a" ? [{ removeAttribute: (name: string) => links.push(name), tabIndex: 0 }] : clones,
  };
  const scene = { cloneNode: () => clone, getBoundingClientRect: () => ({ top: 80, left: 16, width: 900, height: 650, bottom: 730 }) };
  let frame: any;
  const module = { exports: {} as any };
  runInNewContext(compile("src/components/home-palace/palace-entry.ts"), {
    module, exports: module.exports,
    window: {
      innerHeight: 900,
      matchMedia: (query: string) => ({ matches: query.includes("reduced-motion") ? reduced : mobile }),
      addEventListener: (name: string, fn: () => void) => listeners.set(name, fn),
      removeEventListener: (name: string) => listeners.delete(name),
    },
    document: {
      createElement: () => frame = {
        style: {}, dataset: {}, attributes: {} as Record<string, string>,
        setAttribute(name: string, value: string) { this.attributes[name] = value; },
        append() {}, remove() { removed++; },
        addEventListener: (name: string, fn: (event: any) => void) => frameEvents.set(name, fn),
      },
      body: { append: () => appended++ },
    },
    setTimeout: (fn: () => void, duration: number) => {
      assert.ok(duration <= 420, "Visual continuation has a strict lifetime");
      const id = timers.size + 1; timers.set(id, fn); return id;
    },
    clearTimeout: (id: number) => timers.delete(id),
  });
  const start = module.exports.startPalaceEntry;
  start({ querySelector: () => scene }, "silver");
  assert.equal(appended, 1);
  assert.equal(frame.inert, true);
  assert.equal(frame.attributes["aria-hidden"], "true");
  assert.equal(frame.style.left, "16px");
  assert.equal(frame.style.transformOrigin, mobile ? "76% 47%" : "50% 53%");
  assert.deepEqual(ids, ["id", "id"]);
  assert.deepEqual(links, ["href"]);
  if (mobile) assert.equal(clone.dataset.open, "true");
  else assert.deepEqual(clones.map(node => node.dataset.open), ["false", "true", "false"]);
  frameEvents.get("animationend")?.({ target: {} });
  assert.equal(removed, 0, "A child's lid animation must not remove the camera layer");
  listeners.get("popstate")?.();
  assert.equal(removed, 1);
  assert.equal(timers.size, 0);
  assert.equal(listeners.size, 0);
  start({ querySelector: () => scene }, "gold");
  for (const fn of [...timers.values()]) fn();
  assert.equal(removed, 2);
  reduced = true;
  start({ querySelector: () => scene }, "weave");
  assert.equal(appended, 2, "Reduced motion never creates a moving layer");
  assert.equal(timers.size, 0);
}

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await scenario({ mobile: true });
  await scenario({ mobile: true, intro: true });
  await scenario({ mobile: false, unavailable: true });
  await scenario({ mobile: true, saveData: true });
  motionScenario(false); motionScenario(true);
  async function check(art: { variants: { url: string; width: number; height: number; bytes: number }[] }) {
    for (const item of art.variants) {
      const file = `public${item.url}`;
      assert.ok(existsSync(file), item.url);
      const info = await sharp(file).metadata();
      assert.equal(info.format, "webp");
      assert.equal(info.width, item.width); assert.equal(info.height, item.height);
      assert.equal(statSync(file).size, item.bytes);
    }
  }
  await check(assets.desktop); await check(assets.featured); await check(assets.brazier);
  for (const art of Object.values(assets.mobile)) for (const image of Object.values(art)) await check(image);
  for (const art of Object.values(assets.opened)) await check(art);
  for (const product of assets.products) await check(product.image);
  const alpha = await sharp(`public${assets.brazier.variants[0].url}`).stats();
  assert.equal(alpha.channels[3].min, 0, "Brazier must have real transparent pixels");
  const desktopBytes = assets.desktop.variants.at(-1)!.bytes + assets.featured.variants.at(-1)!.bytes + assets.brazier.variants[0].bytes + Object.values(assets.opened).reduce((sum, art) => sum + art.variants[0].bytes, 0);
  const mobileBytes = Object.values(assets.mobile).reduce((sum, art) => sum + Object.values(art).reduce((n, art) => n + art.variants.at(-1)!.bytes, 0), 0) + assets.products.reduce((n, product) => n + product.image.variants[0].bytes, 0);
  assert.ok(desktopBytes < 650 * 1024); assert.ok(mobileBytes < 700 * 1024);
  const home = readFileSync("src/app/[locale]/page.tsx", "utf8");
  assert.ok(home.indexOf("<HeroShowcase locale=") < home.indexOf("<HomePalace"));
  console.log(`PASS: native immediate entry, duplicate-click recovery, intent prefetch/Save-Data, catalogue outage, exact-name links, original photos, SSR/lazy media, back navigation, bounded inert camera and reduced motion. Artwork: desktop ${Math.round(desktopBytes / 1024)} KiB, mobile ${Math.round(mobileBytes / 1024)} KiB.`);
}
main().catch(error => { console.error(error); process.exitCode = 1; });
