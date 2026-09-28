import assert from "node:assert/strict";
import { createStoryGesture, storyFrame } from "../src/lib/treasury-story";

// Full chapters are always opaque, upright, and interactive at the stops.
for (const compact of [true, false]) {
  for (let stop = 0; stop < 4; stop++) {
    const frames = Array.from({ length: 4 }, (_, index) =>
      storyFrame(stop, index, compact),
    );
    assert.equal(frames.filter((frame) => frame.visible).length, 1);
    assert.equal(frames[stop].opacity, "1");
    assert.match(frames[stop].transform, /scale\(1\)/);
  }
  for (let step = 0; step <= 300; step++) {
    const frames = Array.from({ length: 4 }, (_, index) =>
      storyFrame(step / 100, index, compact),
    );
    assert.ok(
      frames.some((frame) => frame.visible && frame.opacity === "1"),
      "never an empty/dark transition frame",
    );
    assert.ok(
      frames.filter((frame) => frame.visible).length <= 2,
      "at most two full-screen composite layers",
    );
    for (const frame of frames)
      assert.ok(!/NaN|Infinity/.test(frame.transform));
  }
}
const gesture = createStoryGesture();
assert.equal(gesture(100, 0), 1);
for (let time = 20; time <= 600; time += 20)
  assert.equal(gesture(30, time), 0, "trackpad tail cannot skip chapters");
assert.equal(gesture(100, 900), 1, "new gesture advances immediately");
assert.equal(gesture(-100, 950), -1, "reverse direction works without waiting");
const tiny = createStoryGesture();
assert.equal(tiny(3, 0), 0);
assert.equal(tiny(4, 10), 0);
assert.equal(tiny(7, 20), 1);
assert.notEqual(storyFrame(0.5, 1).transform, storyFrame(1.5, 2).transform);
assert.notEqual(storyFrame(1.5, 2).transform, storyFrame(2.5, 3).transform);
console.log(
  "PASS: 600+ transition frames, stable stops, distinct entrances, trackpad inertia, reverse gestures.",
);
