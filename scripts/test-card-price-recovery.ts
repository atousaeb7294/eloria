import assert from "node:assert/strict";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";
import { ProductCardLivePrice } from "../src/components/product-card-live-price";

async function main() {
  const names = ["window", "document", "fetch", "IntersectionObserver", "IS_REACT_ACT_ENVIRONMENT"];
  const previous = new Map(names.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const timeouts = new Map<number, () => void>();
  const intervals = new Map<number, () => void>();
  let nextId = 0;
  const doc = Object.assign(new EventTarget(), { visibilityState: "visible" });
  const win = Object.assign(new EventTarget(), {
    setTimeout: (fn: () => void) => { timeouts.set(++nextId, fn); return nextId; },
    clearTimeout: (id: number) => timeouts.delete(id),
    setInterval: (fn: () => void) => { intervals.set(++nextId, fn); return nextId; },
    clearInterval: (id: number) => intervals.delete(id),
  });
  const pending: { resolve: (value: Response) => void; signal: AbortSignal }[] = [];
  const fetcher = (_url: string, options: RequestInit) => new Promise<Response>((resolve, reject) => {
    const signal = options.signal!;
    pending.push({ resolve, signal });
    signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
  });
  class Observer {
    constructor(private cb: (entries: { isIntersecting: boolean }[]) => void) {}
    observe() { this.cb([{ isIntersecting: true }]); }
    disconnect() {}
  }
  for (const [name, value] of Object.entries({ window: win, document: doc, fetch: fetcher, IntersectionObserver: Observer, IS_REACT_ACT_ENVIRONMENT: true }))
    Object.defineProperty(globalThis, name, { value, configurable: true });
  let tree: ReactTestRenderer | undefined;
  try {
    await act(async () => { tree = create(React.createElement(ProductCardLivePrice, { slug: "one", locale: "fa" }), { createNodeMock: () => ({}) }); });
    assert.equal(pending.length, 1);
    await act(async () => { for (const interval of intervals.values()) interval(); win.dispatchEvent(new Event("online")); });
    assert.equal(pending.length, 1, "A slow request must never overlap a retry or periodic refresh");
    await act(async () => { for (const timeout of [...timeouts.values()]) timeout(); });
    assert.match(JSON.stringify(tree!.toJSON()), /قیمت در صفحه محصول/, "Timeout replaces the endless spinner with a fallback");
    await act(async () => win.dispatchEvent(new Event("online")));
    assert.equal(pending.length, 2);
    await act(async () => pending[1].resolve(new Response(JSON.stringify({ successful: true, pricing: { finalPriceToman: "1234000" } }), {status:200})));
    assert.match(JSON.stringify(tree!.toJSON()), /۱٬۲۳۴٬۰۰۰/);
    doc.visibilityState = "hidden";
    await act(async () => { for (const interval of intervals.values()) interval(); doc.dispatchEvent(new Event("visibilitychange")); });
    assert.equal(pending.length, 2, "Hidden tabs do not fetch price updates");
    doc.visibilityState = "visible";
    await act(async () => doc.dispatchEvent(new Event("visibilitychange")));
    assert.equal(pending.length, 3);
    await act(async () => tree!.unmount()); tree = undefined;
    assert.equal(pending[2].signal.aborted, true);
    assert.equal(timeouts.size, 0); assert.equal(intervals.size, 0);
    win.dispatchEvent(new Event("online"));
    assert.equal(pending.length, 3, "Listeners are removed after unmount");
    console.log("PASS: price timeout fallback, reconnect recovery, no overlapping requests, hidden-tab pause and cleanup");
  } finally {
    if (tree) await act(async () => tree!.unmount());
    for (const [name, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor); else Reflect.deleteProperty(globalThis, name);
    }
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
