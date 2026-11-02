import React from "react";
import assert from "node:assert/strict";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { TreasuryPortal, useMobileTreasury } from "../src/components/treasury-portal";

const keys = ["gold", "silver", "weave"] as const;
function Gates() {
  const { grid, active, setActive } = useMobileTreasury();
  return <div ref={grid}>{keys.map(key => <TreasuryPortal key={key} locale="fa" prefetch={false}
    treasury={{ key, fa: key, en: key, tagline: "", english: "" }}
    mobileActive={active} onMobileChange={setActive} />)}</div>;
}

async function main() {
  const events = new EventTarget();
  const media = Object.assign(new EventTarget(), { matches: true });
  let offset = 0;
  let paint: FrameRequestCallback | undefined;
  Object.assign(globalThis, { self: { setTimeout, clearTimeout }, IS_REACT_ACT_ENVIRONMENT: true, window: Object.assign(events, {
    innerHeight: 800, matchMedia: () => media, cancelAnimationFrame: () => { paint = undefined; },
    requestAnimationFrame: (fn: FrameRequestCallback) => { paint = fn; return 1; },
  }) });
  const cards = keys.map((treasury, i) => ({
    dataset: { treasury }, getBoundingClientRect: () => ({
      top: 300 + 150 * i - offset, bottom: 440 + 150 * i - offset,
    }),
  }));
  let view!: ReactTestRenderer;
  await act(() => { view = create(<Gates />, { createNodeMock: () => ({ querySelectorAll: () => cards }) }); });
  const opened = () => view.root.findAllByType("article").filter(el => el.props.className.includes("is-open")).map(el => el.props["data-treasury"]);
  const scroll = async (y: number) => {
    offset = y;
    await act(() => { events.dispatchEvent(new Event("scroll")); paint?.(0); });
  };
  assert.deepEqual(opened(), ["gold"]); // All three cards fit within the viewport.
  for (const [offset, expected] of [[150, ["silver"]], [300, ["weave"]], [800, []], [150, ["silver"]], [0, ["gold"]]] as const) {
    await scroll(offset); assert.deepEqual(opened(), expected);
  }
  await act(() => view.root.findAllByProps({ className: "portal-gate-toggle" })[2].props.onClick());
  assert.deepEqual(opened(), ["weave"]);
  await scroll(150); assert.deepEqual(opened(), ["silver"]);
  await act(() => view.unmount());
  console.log("PASS: one mobile gate at a time, forward, reverse, leaving the section and manual tap.");
}
main().catch(error => { console.error(error); process.exitCode = 1; });
