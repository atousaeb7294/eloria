/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated browser/router doubles around the real React component. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";

async function scenario(lockedTreasury?: "gold") {
  const require = createRequire(import.meta.url);
  const timers = new Map<number, () => void>();
  const routes: string[] = [];
  let id = 0;
  const pathname = lockedTreasury ? "/fa/collections/gold" : "/fa/products";
  const mod = { exports: {} as any };
  const compiled = ts.transpileModule(readFileSync("src/components/product-catalog-filters.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, {
    module: mod, exports: mod.exports, URLSearchParams, console,
    window: {
      setTimeout: (fn: () => void) => { timers.set(++id, fn); return id; },
      clearTimeout: (key: number) => timers.delete(key),
    },
    require: (name: string) => {
      if (name === "next/navigation") return { usePathname: () => pathname, useRouter: () => ({ push: (href: string) => routes.push(href) }) };
      if (name === "@/lib/site-measurement-client") return { recordClientMeasurement() {} };
      if (name.includes("icons") || name === "lucide-react") return new Proxy({}, { get: () => () => null });
      return require(name);
    },
  });
  const flush = () => act(async () => {
    for (const [key, fn] of [...timers]) { timers.delete(key); fn(); }
  });
  let tree!: ReactTestRenderer;
  await act(async () => {
    tree = create(React.createElement(React.StrictMode, null, React.createElement(mod.exports.ProductCatalogFilters, {
      locale: "fa", lockedTreasury,
      initialFilters: { search: "", material: "all", collection: "all", minPrice: "", maxPrice: "", availability: "all" },
    })));
  });
  await flush();
  assert.deepEqual(routes, [], "StrictMode mount must not navigate away from an unchanged catalog");
  const search = () => tree.root.findByProps({ id: "product-search" });
  await act(async () => search().props.onChange({ target: { value: "first" } }));
  await act(async () => search().props.onChange({ target: { value: "latest" } }));
  assert.equal(timers.size, 1, "Only the latest debounce remains scheduled");
  await flush();
  assert.equal(routes.length, 1);
  assert.equal(routes[0], `${pathname}?q=latest${lockedTreasury ? "&material=gold" : ""}`);
  await act(async () => search().props.onChange({ target: { value: "enter" } }));
  await act(async () => tree.root.findByType("form").props.onSubmit({ preventDefault() {} }));
  await flush();
  assert.equal(routes.length, 2, "Enter must not submit again when the debounce expires");
  assert.equal(routes[1], `${pathname}?q=enter${lockedTreasury ? "&material=gold" : ""}`);
  await act(async () => search().props.onChange({ target: { value: "leave" } }));
  await act(async () => tree.unmount());
  assert.equal(timers.size, 0, "Leaving the catalog cancels pending navigation");
}

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await scenario();
  await scenario("gold");
  console.log("PASS catalog navigation: StrictMode mount, latest debounce, explicit submission and unmount cleanup.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
