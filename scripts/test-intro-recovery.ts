/* eslint-disable @typescript-eslint/no-explicit-any -- Isolated browser doubles for real React hook effects. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import React, { act } from "react";
import { create, type ReactTestRenderer } from "react-test-renderer";

async function scenario({ reduced = false, saveData = false, seen = false, rejectPlay = false, completeFlow = false, anchor = "", mobile = true } = {}) {
  const require = createRequire(import.meta.url);
  const timers = new Map<number, () => void>();
  const intervals = new Map<number, () => void>();
  let id = 0, writes = 0, plays = 0;
  const doc = { documentElement: { style: { overflow: "" }, removeAttribute() {} }, body: { style: { overflow: "" } } };
  const location = { hash: anchor, pathname: "/fa", search: "" };
  const win = Object.assign(new EventTarget(), {
    location,
    history: { state: {}, replaceState() { location.hash = ""; } },
    matchMedia: (q: string) => ({ matches: q.includes("reduced-motion") ? reduced : mobile }),
    sessionStorage: { getItem: () => seen ? "1" : null, setItem: () => { writes++; } },
    setTimeout: (fn: () => void) => { timers.set(++id, fn); return id; },
    clearTimeout: (key: number) => timers.delete(key),
    setInterval: (fn: () => void) => { intervals.set(++id, fn); return id; },
    clearInterval: (key: number) => intervals.delete(key),
  });
  const mod = { exports: {} as any };
  const compiled = ts.transpileModule(readFileSync("src/components/intro/use-eloria-intro-controller.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  runInNewContext(compiled, {
    module: mod, exports: mod.exports, window: win, document: doc,
    navigator: { connection: { saveData } }, Event, console,
    require: (name: string) => {
      if (name === "@/lib/intro-watchdog") return { mountIntroWatchdog: (_video: unknown, fail: () => void) => fail };
      if (name.endsWith("eloria-intro-config")) return require("../src/components/intro/eloria-intro-config.ts");
      return require(name);
    },
  });
  let state: any;
  const video = { currentTime: 0, paused: true, readyState: 1, pause() {}, load() {}, play() {
    plays++; return rejectPlay ? Promise.reject(new Error("autoplay denied")) : Promise.resolve();
  } };
  function Probe() {
    state = mod.exports.useEloriaIntroController({ locale: "fa" });
    if (["checking", "ready-to-play", "complete"].includes(state.phase)) return null;
    return React.createElement(React.Fragment, null,
      React.createElement("video", { ref: state.firstVideoRef }),
      React.createElement("video", { ref: state.secondVideoRef }));
  }
  let tree!: ReactTestRenderer;
  await act(async () => { tree = create(React.createElement(Probe), { createNodeMock: () => video }); });
  await act(async () => { for (const [key, fn] of [...timers]) { timers.delete(key); fn(); } });
  if (seen || anchor) {
    assert.equal(state.phase, "complete");
    assert.equal(plays, 0, "Internal links must not download/play a hidden intro");
    await act(async () => state.replayIntro());
    assert.equal(location.hash, "", "Replay must clear the CSS skip target");
  }
  assert.equal(state.phase, "video-one");
  assert.ok(plays > 0);
  assert.equal(state.firstVideoSrc.includes("eloria-entry-mobile"), mobile || saveData);
  if (completeFlow) {
    await act(async () => state.handleFirstVideoEnded());
    assert.equal(state.phase, "awaiting-entry");
    await act(async () => state.handleEnterEloria());
    assert.equal(state.phase, "loading-two");
    await act(async () => state.handleSecondVideoPlaying());
    assert.equal(state.phase, "video-two");
    await act(async () => state.beginCinematicReveal());
    assert.equal(state.phase, "flash-in");
    await act(async () => { for (const [key, fn] of [...timers]) { timers.delete(key); fn(); } });
    assert.equal(state.phase, "complete");
    assert.equal(writes, 1);
    await act(async () => tree.unmount());
    assert.equal(timers.size + intervals.size, 0);
    return;
  }
  const before = writes;
  if (rejectPlay) {
    assert.equal(state.autoplayBlocked, true);
    assert.equal(intervals.size, 0, "Autoplay denial must wait for touch, not timeout into home");
  } else {
    await act(async () => { for (const fn of [...intervals.values()]) fn(); });
    assert.equal(state.phase, "video-one");
    assert.equal(state.firstVideoError, true, "Stall must offer retry instead of silently skipping");
  }
  assert.equal(writes, before, "Failure must not persist intro completion");
  await act(async () => tree.unmount());
  assert.equal(timers.size + intervals.size, 0);
  assert.equal(doc.body.style.overflow, "");
}

async function main() {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  await scenario({ completeFlow: true });
  await scenario({ reduced: true });
  await scenario({ saveData: true });
  await scenario({ seen: true });
  await scenario({ rejectPlay: true });
  await scenario({ anchor: "#hero" });
  await scenario({ anchor: "#featured" });
  await scenario({ mobile: false, completeFlow: true });
  console.log("PASS intro: autoplay with reduced-motion/save-data, saved-session replay, mobile source, autoplay recovery, stall recovery, timer and scroll cleanup");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
