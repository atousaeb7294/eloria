/* eslint-disable @typescript-eslint/no-explicit-any -- Browser doubles exercise real gallery effects. */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import manifest from "../src/lib/static-backdrop-manifest.json";
import { staticBackdropLoader } from "../src/lib/static-backdrop-loader";
import { productWeightLabel } from "../src/lib/product-material";

async function gallery(saveData: boolean) {
  const require = createRequire(import.meta.url);
  const timers = new Map<number, () => void>();
  const requests: FakeImage[] = [];
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    naturalWidth = 640;
    complete = false;
    src = "";
    constructor() { requests.push(this); }
    decode() { return Promise.resolve(); }
  }
  const mod = { exports: {} as any };
  const compiled = ts.transpileModule(readFileSync("src/components/prepared-gallery-image.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(compiled, {
    module: mod, exports: mod.exports,
    window: { Image: FakeImage, setTimeout: (fn: () => void) => { timers.set(1, fn); return 1; }, clearTimeout: (id: number) => timers.delete(id) },
    navigator: { connection: { saveData } },
    require: (name: string) => {
      if (name === "next/image") return { getImageProps: (props: any) => ({ props }) };
      if (name === "@/components/product-image") return { ProductImage: () => null };
      return require(name);
    },
  });
  const props = { images: ["first", "next", "last"].map(imageUrl => ({ imageUrl, alt: imageUrl })), index: 0, sizes: "100vw", className: "", locale: "fa" };
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(mod.exports.PreparedGalleryImage, props)); });
  assert.deepEqual(requests.map(image => image.src), ["first"], "Neighbors must not compete with the selected image");
  await act(async () => { requests[0].onload?.(); });
  if (saveData) assert.equal(timers.size, 0);
  else {
    assert.equal(timers.size, 1);
    await act(async () => { for (const [id, fn] of timers) { timers.delete(id); fn(); } });
    assert.deepEqual(requests.map(image => image.src), ["first", "next"], "Only the next photo is warmed after decoding");
  }
  await act(async () => tree.unmount());
  assert.equal(timers.size, 0);
}

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await gallery(false);
  await gallery(true);
  assert.equal(productWeightLabel("GOLD", "fa"), "وزن قطعه طلا");
  assert.equal(productWeightLabel("SILVER", "fa"), "وزن قطعه نقره");
  assert.equal(productWeightLabel("MIXED", "fa"), "وزن فلزات به‌کاررفته");
  for (const [src, variants] of Object.entries(manifest)) {
    for (const variant of variants) assert.ok(existsSync(`public${variant.url}`));
    assert.equal(staticBackdropLoader({ src, width: 640 }), variants.find(v => v.width >= 640)?.url ?? variants.at(-1)?.url);
  }
  console.log("PASS mobile media: selected photo first, deferred next photo, save-data, metal labels and all static backdrop assets");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
