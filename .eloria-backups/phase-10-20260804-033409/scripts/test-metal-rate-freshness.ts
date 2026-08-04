import assert from "node:assert/strict";

import {
  getMetalRateFreshness,
  parseSourceTimeUnix,
} from "../src/lib/metal-rate-freshness";

const now = new Date(
  "2026-07-27T18:00:00.000Z",
);

const nowSeconds = Math.floor(
  now.getTime() / 1000,
);

/*
 * Fresh timestamp expressed in Unix seconds.
 */
const freshFromSeconds =
  getMetalRateFreshness({
    sourceTimeUnix:
      nowSeconds - 60,
    staleAfterMinutes: 15,
    now,
  });

assert.equal(
  freshFromSeconds.isStale,
  false,
);

assert.equal(
  freshFromSeconds.ageSeconds,
  60,
);

assert.equal(
  freshFromSeconds.reason,
  "FRESH",
);

/*
 * Unix milliseconds must also be supported.
 */
const parsedMilliseconds =
  parseSourceTimeUnix(
    now.getTime(),
  );

assert.equal(
  parsedMilliseconds?.toISOString(),
  now.toISOString(),
);

/*
 * A rate older than the configured limit is stale.
 */
const staleRate =
  getMetalRateFreshness({
    sourceTimeUnix:
      nowSeconds - 16 * 60,
    staleAfterMinutes: 15,
    now,
  });

assert.equal(
  staleRate.isStale,
  true,
);

assert.equal(
  staleRate.reason,
  "STALE",
);

/*
 * Missing market timestamp must never be accepted for checkout.
 */
const missingTimestamp =
  getMetalRateFreshness({
    sourceTimeUnix: null,
    staleAfterMinutes: 15,
    now,
  });

assert.equal(
  missingTimestamp.isStale,
  true,
);

assert.equal(
  missingTimestamp.ageSeconds,
  null,
);

assert.equal(
  missingTimestamp.reason,
  "SOURCE_TIME_MISSING",
);

/*
 * Small clock skew is acceptable.
 */
const acceptableClockSkew =
  getMetalRateFreshness({
    sourceTimeUnix:
      nowSeconds + 2 * 60,
    staleAfterMinutes: 15,
    now,
  });

assert.equal(
  acceptableClockSkew.isStale,
  false,
);

assert.equal(
  acceptableClockSkew.ageSeconds,
  0,
);

/*
 * A timestamp far in the future is invalid.
 */
const futureTimestamp =
  getMetalRateFreshness({
    sourceTimeUnix:
      nowSeconds + 10 * 60,
    staleAfterMinutes: 15,
    now,
  });

assert.equal(
  futureTimestamp.isStale,
  true,
);

assert.equal(
  futureTimestamp.reason,
  "SOURCE_TIME_IN_FUTURE",
);

/*
 * Invalid values must be rejected.
 */
const invalidTimestamp =
  getMetalRateFreshness({
    sourceTimeUnix:
      "not-a-timestamp",
    staleAfterMinutes: 15,
    now,
  });

assert.equal(
  invalidTimestamp.isStale,
  true,
);

assert.equal(
  invalidTimestamp.reason,
  "SOURCE_TIME_INVALID",
);

console.log(
  "PASS: metal-rate freshness uses the real market timestamp.",
);