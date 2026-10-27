/* eslint-disable @typescript-eslint/no-explicit-any -- UI action doubles; no database connection. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const require = createRequire(import.meta.url);
  const sandboxModule = { exports: {} as any };
  const calls: any[] = [];
  let complete!: (value: any) => void;
  const actions = {
    prepareHomeHeroAction: (...args: any[]) => { calls.push(["prepare", ...args]); return new Promise(resolve => { complete = resolve; }); },
    saveHomeHeroOnlyAction: async (value: any) => { calls.push(["save", value]); return { ok: true, version: "v2" }; },
    uploadHomeHeroAction: (form: FormData) => { calls.push(["upload", form]); return new Promise(resolve => { complete = resolve; }); },
    removeUploadedHomeHeroAction: async (input: any) => { calls.push(["remove", input]); return { ok: true, version: "v4" }; },
    saveHomeAppearanceAction: async () => { throw new Error("Featured save should not run"); },
  };
  const code = ts.transpileModule(readFileSync("src/components/admin/home-appearance-editor.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  runInNewContext(code, {
    module: sandboxModule, exports: sandboxModule.exports, console, URL, FormData, File,
    require: (name: string) => name.endsWith("/appearance/actions") ? actions
      : name === "next/image" ? { __esModule: true, default: () => null }
        : name === "@/components/floating-product-image" ? { FloatingProductImage: (props: any) => React.createElement("img", { src: props.cutoutSrc }) }
          : require(name),
  });
  const products = [{ id: "p1", nameFa: "دلبر", slug: "delbar", images: [{ id: "i1", imageUrl: "/one.png" }, { id: "i2", imageUrl: "/two.png" }] }];
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(sandboxModule.exports.HomeAppearanceEditor, {
    products, initial: { productId: "p1", imageId: "i1", cutoutId: "", scale: 92, featuredIds: [], featuredCutouts: [], version: "v1" },
  })); });
  const button = (label: string) => tree.root.findAllByType("button").find(node => node.children.join("").includes(label))!;
  assert.equal(button("ذخیره برای هوم").props.disabled, true);
  await act(async () => button("حذف زمینه").props.onClick());
  assert.deepEqual(calls.slice(), [["prepare", "p1", "i1"]]);
  assert.equal(tree.root.findByType("fieldset").props.disabled, true);
  assert.ok(tree.root.findAllByProps({ role: "status" })[0].children.join("").includes("آماده‌سازی"), "Hero progress is next to the hero, not below featured products");
  await act(async () => complete({ ok: true, id: "cutout-1", imageUrl: "/api/media/hero/cutout-1" }));
  assert.equal(tree.root.findByType("img").props.src, "/api/media/hero/cutout-1");
  assert.equal(button("ذخیره برای هوم").props.disabled, false);
  await act(async () => button("ذخیره برای هوم").props.onClick());
  assert.equal(calls.at(-1)[1].expectedVersion, "v1");
  assert.equal(calls.at(-1)[1].imageId, "i1");
  await act(async () => tree.root.findAllByType("select")[2].props.onChange({ target: { value: "i2" } }));
  assert.equal(tree.root.findAllByType("img").length, 0, "Changing the source clears the old cutout preview");
  assert.deepEqual(calls.at(-1), ["prepare", "p1", "i2"]);
  await act(async () => complete({ ok: false, error: "حافظهٔ آزاد سرور کافی نیست" }));
  assert.equal(button("ذخیره برای هوم").props.disabled, true);
  assert.ok(tree.root.findAllByProps({ role: "status" })[0].children.join("").includes("حافظه"));
  assert.equal(calls.filter(call => call[0] === "save").length, 1, "Failed preparation never overwrites the published hero");
  await act(async () => button("حذف زمینه").props.onClick());
  await act(async () => complete({ ok: true, id: "cutout-2", imageUrl: "/api/media/hero/cutout-2" }));
  await act(async () => button("ذخیره برای هوم").props.onClick());
  assert.equal(calls.at(-1)[1].expectedVersion, "v2", "Successful saves advance the concurrency version");
  await act(async () => tree.root.findByProps({ "aria-label": "روش نمایش محصول" }).props.onChange({ target: { value: "random" } }));
  await act(async () => button("ذخیره برای هوم").props.onClick());
  assert.equal(calls.at(-1)[1].mode, "random");
  assert.equal(calls.at(-1)[1].expectedVersion, "v2");
  await act(async () => tree.root.findByProps({ "aria-label": "روش نمایش محصول" }).props.onChange({ target: { value: "upload" } }));
  assert.equal(button("ذخیره برای هوم").props.disabled, true);
  const file = new File([new Uint8Array([1, 2, 3])], "mine.png", { type: "image/png" });
  const prepareCount = calls.filter(call => call[0] === "prepare").length;
  await act(async () => tree.root.findByProps({ "aria-label": "عکس شفاف هوم" }).props.onChange({ target: { files: [file] } }));
  assert.equal(calls.filter(call => call[0] === "prepare").length, prepareCount, "Direct uploads must not invoke automatic cutout");
  assert.ok(tree.root.findByType("img").props.src.startsWith("blob:"));
  assert.equal(button("ذخیره برای هوم").props.disabled, false);
  await act(async () => button("ذخیره برای هوم").props.onClick());
  assert.equal(tree.root.findByType("fieldset").props.disabled, true);
  assert.equal(calls.at(-1)[1].get("image").name, "mine.png");
  assert.equal(calls.at(-1)[1].get("expectedVersion"), "v2");
  await act(async () => complete({ ok: false, error: "زمینهٔ عکس شفاف نیست" }));
  assert.ok(tree.root.findByType("img").props.src.startsWith("blob:"), "Failed upload preserves the chosen file for retry");
  await act(async () => button("ذخیره برای هوم").props.onClick());
  await act(async () => complete({ ok: true, id: "uploaded", imageUrl: "/api/media/hero/uploaded", version: "v3" }));
  assert.equal(tree.root.findByType("img").props.src, "/api/media/hero/uploaded");
  await act(async () => button("ذخیره برای هوم").props.onClick());
  assert.equal(calls.at(-1)[1].mode, "upload");
  assert.equal(calls.at(-1)[1].cutoutId, "uploaded");
  assert.equal(calls.at(-1)[1].expectedVersion, "v3");
  await act(async () => button("حذف عکس بارگذاری‌شده").props.onClick());
  assert.equal(calls.at(-1)[0], "remove");
  assert.equal(tree.root.findAllByType("img").length, 0);
  await act(async () => tree.unmount());
  console.log("PASS: admin prepare/preview/save, automatic source changes, adjacent errors, failed-preparation gating and version updates.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
