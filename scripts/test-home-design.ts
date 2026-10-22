import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  boundedImageBody,
  validFeaturedIds,
  MAX_HERO_BYTES,
} from "../src/lib/home-design-contract";
async function main() {
  const ids = Array.from({ length: 8 }, () => randomUUID());
  assert.equal(validFeaturedIds(ids), true);
  for (const value of [
    null,
    [],
    ids.slice(1),
    [...ids, randomUUID()],
    ids.map(() => ids[0]),
    [...ids.slice(1), "invalid"],
  ])
    assert.equal(validFeaturedIds(value), false);
  assert.deepEqual(
    await boundedImageBody(new Response(new Uint8Array([1, 2, 3]))),
    Buffer.from([1, 2, 3]),
  );
  await assert.rejects(
    boundedImageBody(new Response(null)),
    /IMAGE_TOO_LARGE|EMPTY_IMAGE/,
  );
  await assert.rejects(
    boundedImageBody(
      new Response(new Uint8Array(1), {
        headers: { "content-length": String(MAX_HERO_BYTES + 1) },
      }),
    ),
    /IMAGE_TOO_LARGE/,
  );
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      controller.enqueue(new Uint8Array(1024 * 1024));
    },
    cancel() {
      cancelled = true;
    },
  });
  await assert.rejects(
    boundedImageBody(new Response(stream)),
    /IMAGE_TOO_LARGE/,
  );
  assert.equal(cancelled, true);
  console.log(
    "Home design: eight selections, bounded image reads and cancellation passed.",
  );
}
void main();
