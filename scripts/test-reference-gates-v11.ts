import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import Image from "next/image";
import sharp from "sharp";
import { TreasuryPortal } from "../src/components/treasury-portal";
import { ReferenceTreasuryGate } from "../src/components/reference-treasury-gate";
import { GATE_CROPS, GATE_SIZE, GATE_SOURCE_SIZE, REFERENCE_GATE_ART } from "../src/lib/reference-treasury-gate";
import { loadHomeDesign, type HomeDesignSource, type HomeProduct } from "../src/lib/home-design-data";

async function main() {
  const bytes = fs.readFileSync(`public${REFERENCE_GATE_ART}`);
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "7f5fb24882f062116d2653b72a81d7813293e317d5d61f1ed4b424e1c99050f2", "Use the exact supplied reference, not a redrawn approximation");
  const metadata = await sharp(bytes).metadata();
  assert.equal(metadata.width, GATE_SOURCE_SIZE.width); assert.equal(metadata.height, GATE_SOURCE_SIZE.height);
  for (const crop of Object.values(GATE_CROPS)) {
    assert(crop.x >= 0 && crop.x + GATE_SIZE.width <= GATE_SOURCE_SIZE.width);
    assert(crop.y >= 0 && crop.y + GATE_SIZE.height <= GATE_SOURCE_SIZE.height);
  }
  const gates = renderToStaticMarkup(createElement("div", {}, ...(["gold", "silver", "weave"] as const).map(treasury => createElement(ReferenceTreasuryGate, { treasury, key: treasury }))));
  const ids = [...gates.matchAll(/id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(ids.length, 6); assert.equal(new Set(ids).size, 6, "Clipping references must be unique per gate");
  assert.equal((gates.match(/eloria-gates-reference-v11\.jpg/g) ?? []).length, 3);
  assert(!gates.includes("<img"), "The hidden desktop markup must not request a separate mobile img element");

  const row = (id: string, group: "gold" | "silver" | "weave"): HomeProduct => ({
    id, slug: id, nameFa: id, nameEn: id, hasGold: group === "gold", hasSilver: group === "silver", status: "ACTIVE",
    collection: { isActive: true }, images: [{ id: `${id}-photo`, imageUrl: `/api/media/products/${id}` }],
  });
  const selected = Array.from({ length: 8 }, (_, index) => row(`gold-${index}`, "gold"));
  const requested: string[] = [];
  const source: HomeDesignSource = {
    appearance: async () => null, products: async () => selected, cutouts: async () => [], report: () => {},
    treasuryProduct: async group => { requested.push(group); return row(`${group}-preview`, group); },
  };
  const design = await loadHomeDesign("fa", source);
  assert.deepEqual(design.pieces.map(piece => piece.id), selected.map(product => product.id), "Treasury previews must not change the featured selection or order");
  assert.deepEqual(requested.sort(), ["silver", "weave"]);
  assert.deepEqual(design.treasuryPieces?.map(piece => piece.group), ["gold", "silver", "weave"]);
  const hidden = await loadHomeDesign("fa", { ...source, treasuryProduct: async group => ({ ...row(group, group), status: "DRAFT" }) });
  assert.deepEqual(hidden.treasuryPieces?.map(piece => piece.group), ["gold"]);
  const wrong = await loadHomeDesign("fa", { ...source, treasuryProduct: async () => row("wrong", "gold") });
  assert.equal(wrong.treasuryPieces?.length, 1, "A missing category must not display another category's product");
  const offline = await loadHomeDesign("fa", { ...source, treasuryProduct: async () => { throw new Error("offline"); } });
  assert.equal(offline.pieces.length, 8); assert.equal(offline.unavailable, false);

  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  const originals = new Map(["window", "self"].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const browser = { setTimeout, clearTimeout, location: { href: "https://example.invalid/fa" } };
  for (const key of originals.keys()) Object.defineProperty(globalThis, key, { configurable: true, value: browser });
  let view: ReactTestRenderer | undefined;
  const treasury = { key: "silver" as const, fa: "نقره", en: "Silver", tagline: "روشن، آرام، همراه هر روز", english: "Quiet brilliance" };
  const piece = { id: "live", slug: "live-product", name: "اثر واقعی", group: "silver" as const, imageUrl: "/api/media/products/12345678-1234-4234-8234-123456789abc", cutoutUrl: "/api/media/hero/12345678-1234-4234-8234-123456789abc" };
  try {
    await act(async () => { view = create(createElement(TreasuryPortal, { treasury, piece, locale: "fa", prefetch: false })); });
    const toggle = () => view!.root.findByType("button");
    const card = () => view!.root.findByType("article");
    assert.equal(toggle().props["aria-expanded"], false);
    await act(async () => card().props.onPointerEnter({ pointerType: "touch" }));
    assert.equal(toggle().props["aria-expanded"], false);
    await act(async () => toggle().props.onClick());
    assert.equal(toggle().props["aria-expanded"], true);
    assert(card().props.className.includes("is-open"));
    assert.equal(view!.root.findByType(Image).props.src, piece.cutoutUrl);
    assert.equal(view!.root.findByType(Image).props.fetchPriority, "high");
    assert.equal(view!.root.findByType("a").props.href, "/fa/collections/silver");
    assert.equal(view!.root.findByType("a").props["aria-label"], "ورود به گنجینهٔ نقره");
    assert.equal(toggle().findAllByType("a").length, 0, "Preview controls must not nest navigation links");
    await act(async () => view!.root.findByType(Image).props.onError());
    assert.equal(view!.root.findByType(Image).props.src, piece.imageUrl, "A failed cutout falls back to the same product's photo");
    await act(async () => view!.root.findByType(Image).props.onError());
    assert.equal(view!.root.findAllByType(Image).length, 0, "Never substitute a vase, stock product or logo on error");
    await act(async () => card().props.onKeyDown({ key: "Escape" }));
    assert.equal(toggle().props["aria-expanded"], false);
    await act(async () => card().props.onPointerEnter({ pointerType: "mouse" }));
    assert.equal(toggle().props["aria-expanded"], true);
    await act(async () => card().props.onPointerLeave({ pointerType: "mouse" }));
    assert.equal(toggle().props["aria-expanded"], false);
    await act(async () => view!.unmount()); view = undefined;
    console.log("PASS: exact reference bytes, crop bounds, unique clips, real category previews, unchanged featured order, hidden/wrong-category filtering, touch toggle, desktop hover, Escape, direct entry link, image priority and safe photo fallback.");
  } finally {
    if (view) await act(async () => view!.unmount());
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor); else Reflect.deleteProperty(globalThis, key);
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
