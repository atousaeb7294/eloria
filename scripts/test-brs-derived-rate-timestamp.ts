import assert from "node:assert/strict";

import {
  getOldestRequiredSourceTimestamp,
} from "../src/lib/brs-market";

/**
 * حالت اول:
 * زمان نقره قدیمی‌تر از زمان دلار است.
 */
const silverOlder = {
  date: "2026-07-28",
  time: "10:00:00",
  time_unix: 1_700_000_000,
};

const usdNewer = {
  date: "2026-07-28",
  time: "10:10:00",
  time_unix: 1_700_000_600,
};

const firstResult =
  getOldestRequiredSourceTimestamp(
    silverOlder,
    usdNewer,
  );

assert.deepEqual(
  firstResult,
  {
    sourceDate: "2026-07-28",
    sourceTime: "10:00:00",
    sourceTimeUnix: 1_700_000_000,
  },
);

/**
 * حالت دوم:
 * timestamp نقره برحسب میلی‌ثانیه است،
 * اما زمان دلار قدیمی‌تر است.
 */
const silverNewerMilliseconds = {
  date: "2026-07-28",
  time: "10:20:00",
  time_unix: 1_700_001_200_000,
};

const usdOlderSeconds = {
  date: "2026-07-28",
  time: "10:10:00",
  time_unix: 1_700_000_600,
};

const secondResult =
  getOldestRequiredSourceTimestamp(
    silverNewerMilliseconds,
    usdOlderSeconds,
  );

assert.deepEqual(
  secondResult,
  {
    sourceDate: "2026-07-28",
    sourceTime: "10:10:00",
    sourceTimeUnix: 1_700_000_600,
  },
);

/**
 * حالت سوم:
 * timestamp یکی از ورودی‌های ضروری موجود نیست.
 * در این شرایط نرخ ترکیبی نباید معتبر شناخته شود.
 */
const missingTimestampResult =
  getOldestRequiredSourceTimestamp(
    {
      date: "2026-07-28",
      time: "10:00:00",
      time_unix: null,
    },
    usdNewer,
  );

assert.deepEqual(
  missingTimestampResult,
  {
    sourceDate: null,
    sourceTime: null,
    sourceTimeUnix: null,
  },
);

/**
 * حالت چهارم:
 * timestamp یکی از ورودی‌ها نامعتبر است.
 */
const invalidTimestampResult =
  getOldestRequiredSourceTimestamp(
    {
      date: "2026-07-28",
      time: "10:00:00",
      time_unix: "invalid",
    },
    usdNewer,
  );

assert.deepEqual(
  invalidTimestampResult,
  {
    sourceDate: null,
    sourceTime: null,
    sourceTimeUnix: null,
  },
);

/**
 * حالت پنجم:
 * timestamp منفی نباید معتبر پذیرفته شود.
 */
const negativeTimestampResult =
  getOldestRequiredSourceTimestamp(
    {
      date: "2026-07-28",
      time: "10:00:00",
      time_unix: -100,
    },
    usdNewer,
  );

assert.deepEqual(
  negativeTimestampResult,
  {
    sourceDate: null,
    sourceTime: null,
    sourceTimeUnix: null,
  },
);

console.log(
  "PASS: derived silver rate uses the oldest required market timestamp.",
);