/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated SDK/browser doubles; no real CAPTCHA is requested. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";

async function sdkRecovery() {
  const elements: any[] = [], timers = new Map<number, () => void>();
  let next = 0;
  const win: any = { setTimeout: (fn: () => void) => { timers.set(++next, fn); return next; }, clearTimeout: (id: number) => timers.delete(id) };
  const mod = { exports: {} as any };
  const code = ts.transpileModule(readFileSync("src/lib/turnstile-loader.ts", "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, {
    module: mod, exports: mod.exports, window: win,
    document: { head: { appendChild: (element: any) => elements.push(element) }, createElement: () => {
      const element: any = { events: {}, removed: false, remove() { element.removed = true; }, addEventListener(name: string, fn: () => void) { element.events[name] = fn; } };
      return element;
    } },
  });
  const first = mod.exports.loadTurnstileSdk();
  assert.equal(first, mod.exports.loadTurnstileSdk(), "Two forms share one SDK request");
  assert.equal(elements.length, 1);
  elements[0].events.error();
  await assert.rejects(first, /could not load/);
  const retry = mod.exports.loadTurnstileSdk();
  assert.equal(elements.length, 2, "A failed SDK load can really be retried");
  assert.equal(elements[1].src, "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit");
  win.turnstile = {};
  elements[1].events.load();
  await retry;
  assert.equal(timers.size, 0);
  assert.equal(elements[0].removed, true);
}

async function main() {
  await sdkRecovery();
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  const require = createRequire(import.meta.url);
  let fetches = 0, executions = 0, resets = 0, removes = 0, options: any;
  let state = "", token: string | null = null;
  let timerId = 0;
  const timers = new Map<number, { fn: () => void; ms: number }>();
  const win = {
    turnstile: {
      render: (_id: string, opts: unknown) => { options = opts; return "test-widget"; },
      execute: () => { executions++; }, reset: () => { resets++; }, remove: () => { removes++; },
    },
    setTimeout: (fn: () => void, ms: number) => { timers.set(++timerId, { fn, ms }); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
  };
  const mod = { exports: {} as any };
  const code = ts.transpileModule(readFileSync("src/components/turnstile-widget.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  runInNewContext(code, {
    module: mod, exports: mod.exports, window: win, queueMicrotask, AbortController, DOMException, console,
    fetch: async () => { fetches++; throw new Error("Config request should be unnecessary"); },
    require: (name: string) => name === "@/lib/turnstile-loader" ? { loadTurnstileSdk: async () => {} } : require(name),
  });
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(mod.exports.TurnstileWidget, {
    locale: "fa", action: "customer-password-recovery",
    initialConfig: { siteKey: "public-test-site-key", required: true },
    onTokenChange: (value: string | null) => { token = value; },
    onStateChange: (value: string) => { state = value; },
  })); });
  assert.equal(fetches, 0);
  assert.equal(state, "ready");
  assert.equal(executions, 0, "No challenge executes before the visitor's gesture");
  assert.equal(options.execution, "execute");
  assert.equal(options.action, "customer-password-recovery");
  await act(async () => tree.root.findAllByType("button")[0].props.onClick());
  assert.equal(state, "verifying");
  assert.equal(token, null);
  assert.equal(executions, 1);
  await act(async () => options.callback("valid-provider-token"));
  assert.equal(state, "verified");
  assert.equal(token, "valid-provider-token");
  await act(async () => options["expired-callback"]());
  assert.equal(token, null);
  assert.equal(state, "ready");
  assert.equal(resets, 1);
  await act(async () => tree.root.findAllByType("button")[0].props.onClick());
  await act(async () => {
    for (const { fn, ms } of [...timers.values()]) if (ms === 30_000) fn();
  });
  assert.equal(state, "error");
  assert.equal(token, null, "Timeout must never enable membership");
  assert.equal(tree.root.findAllByType("button").length, 2, "Retry is offered without losing form input");
  await act(async () => tree.unmount());
  assert.ok(removes > 0);
  console.log("PASS: shared/retryable official SDK; no extra login config request; explicit verification preserved; expired/timeout tokens cannot enable membership; cleanup.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
