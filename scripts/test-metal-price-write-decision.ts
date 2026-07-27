import assert from "node:assert/strict";

import {
  decideCurrentRateWrite,
} from "../src/lib/metal-price-sync";

/**
 * حالت اول:
 * نرخ ورودی قدیمی‌تر از نرخ فعلی است.
 * نباید نرخ فعلی دیتابیس بازنویسی شود.
 */
const olderIncomingResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      1_700_001_200,

    incomingSourceTimeUnix:
      1_700_000_600,
  });

assert.deepEqual(
  olderIncomingResult,
  {
    applyIncoming:
      false,

    reason:
      "INCOMING_IS_OLDER",
  },
);

/**
 * حالت دوم:
 * نرخ ورودی جدیدتر است.
 * باید اجازه به‌روزرسانی داشته باشد.
 */
const newerIncomingResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      1_700_000_600,

    incomingSourceTimeUnix:
      1_700_001_200,
  });

assert.deepEqual(
  newerIncomingResult,
  {
    applyIncoming:
      true,

    reason:
      "INCOMING_IS_NEWER_OR_EQUAL",
  },
);

/**
 * حالت سوم:
 * timestamp برابر است.
 *
 * این حالت مجاز است؛ چون ممکن است منبع
 * قیمت همان لحظه بازار را اصلاح کرده باشد.
 */
const equalTimestampResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      1_700_000_600,

    incomingSourceTimeUnix:
      1_700_000_600,
  });

assert.deepEqual(
  equalTimestampResult,
  {
    applyIncoming:
      true,

    reason:
      "INCOMING_IS_NEWER_OR_EQUAL",
  },
);

/**
 * حالت چهارم:
 * timestamp فعلی برحسب ثانیه و timestamp ورودی
 * برحسب میلی‌ثانیه است، اما هر دو یک زمان‌اند.
 */
const equalMixedUnitsResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      1_700_000_600,

    incomingSourceTimeUnix:
      1_700_000_600_000,
  });

assert.deepEqual(
  equalMixedUnitsResult,
  {
    applyIncoming:
      true,

    reason:
      "INCOMING_IS_NEWER_OR_EQUAL",
  },
);

/**
 * حالت پنجم:
 * دیتابیس timestamp معتبر ندارد،
 * اما نرخ ورودی timestamp معتبر دارد.
 */
const missingCurrentTimestampResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      null,

    incomingSourceTimeUnix:
      1_700_000_600,
  });

assert.deepEqual(
  missingCurrentTimestampResult,
  {
    applyIncoming:
      true,

    reason:
      "CURRENT_TIMESTAMP_MISSING",
  },
);

/**
 * حالت ششم:
 * دیتابیس timestamp معتبر دارد،
 * اما نرخ ورودی timestamp ندارد.
 *
 * نرخ بدون زمان معتبر نباید جای نرخ معتبر را بگیرد.
 */
const missingIncomingTimestampResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      1_700_000_600,

    incomingSourceTimeUnix:
      null,
  });

assert.deepEqual(
  missingIncomingTimestampResult,
  {
    applyIncoming:
      false,

    reason:
      "INCOMING_TIMESTAMP_MISSING",
  },
);

/**
 * حالت هفتم:
 * هیچ‌کدام timestamp ندارند.
 *
 * این رفتار برای سازگاری با داده‌های قدیمی مجاز است،
 * ولی نتیجه بعداً در موتور Freshness منقضی شناخته می‌شود.
 */
const bothMissingResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      null,

    incomingSourceTimeUnix:
      null,
  });

assert.deepEqual(
  bothMissingResult,
  {
    applyIncoming:
      true,

    reason:
      "BOTH_TIMESTAMPS_MISSING",
  },
);

/**
 * حالت هشتم:
 * مقدار منفی برای نرخ ورودی نامعتبر است.
 */
const negativeIncomingTimestampResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      1_700_000_600,

    incomingSourceTimeUnix:
      -100,
  });

assert.deepEqual(
  negativeIncomingTimestampResult,
  {
    applyIncoming:
      false,

    reason:
      "INCOMING_TIMESTAMP_MISSING",
  },
);

/**
 * حالت نهم:
 * Prisma مقدار timestamp را به‌صورت bigint برمی‌گرداند.
 */
const bigintCurrentTimestampResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      BigInt(
        1_700_000_600,
      ),

    incomingSourceTimeUnix:
      1_700_001_200,
  });

assert.deepEqual(
  bigintCurrentTimestampResult,
  {
    applyIncoming:
      true,

    reason:
      "INCOMING_IS_NEWER_OR_EQUAL",
  },
);

/**
 * حالت دهم:
 * نرخ ورودی میلی‌ثانیه‌ای واقعاً قدیمی‌تر
 * از نرخ فعلی ثانیه‌ای است.
 */
const olderMixedUnitsResult =
  decideCurrentRateWrite({
    currentSourceTimeUnix:
      1_700_001_200,

    incomingSourceTimeUnix:
      1_700_000_600_000,
  });

assert.deepEqual(
  olderMixedUnitsResult,
  {
    applyIncoming:
      false,

    reason:
      "INCOMING_IS_OLDER",
  },
);

console.log(
  "PASS: older API rates cannot overwrite newer database rates.",
);