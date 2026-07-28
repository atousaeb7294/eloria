import assert from "node:assert/strict";

import {
  getMetalRateSaleDecision,
} from "../src/lib/metal-rate-sale-policy";

const liveDecision =
  getMetalRateSaleDecision({
    referencePricePerGramToman:
      "18209300",

    freshness: {
      ageSeconds:
        5 * 60,

      isStale:
        false,

      reason:
        "FRESH",
    },

    closedMarketPricingEnabled:
      true,

    closedMarketMaxAgeMinutes:
      720,

    closedMarketSafetyMarginPercent:
      "2",
  });

assert.equal(
  liveDecision.mode,
  "LIVE",
);

assert.equal(
  liveDecision.isUsableForSale,
  true,
);

assert.equal(
  liveDecision.effectivePricePerGramToman,
  "18209300",
);

assert.equal(
  liveDecision.safetyMarginAmountToman,
  "0",
);

const closedMarketDecision =
  getMetalRateSaleDecision({
    referencePricePerGramToman:
      "18209300",

    freshness: {
      ageSeconds:
        6 * 60 * 60,

      isStale:
        true,

      reason:
        "STALE",
    },

    closedMarketPricingEnabled:
      true,

    closedMarketMaxAgeMinutes:
      720,

    closedMarketSafetyMarginPercent:
      "2",
  });

assert.equal(
  closedMarketDecision.mode,
  "CLOSED_MARKET",
);

assert.equal(
  closedMarketDecision.isUsableForSale,
  true,
);

assert.equal(
  closedMarketDecision.originalPricePerGramToman,
  "18209300",
);

assert.equal(
  closedMarketDecision.safetyMarginAmountToman,
  "364186",
);

assert.equal(
  closedMarketDecision.effectivePricePerGramToman,
  "18573486",
);

assert.equal(
  closedMarketDecision.appliedSafetyMarginPercent,
  "2",
);

const tooOldDecision =
  getMetalRateSaleDecision({
    referencePricePerGramToman:
      "18209300",

    freshness: {
      ageSeconds:
        13 * 60 * 60,

      isStale:
        true,

      reason:
        "STALE",
    },

    closedMarketPricingEnabled:
      true,

    closedMarketMaxAgeMinutes:
      720,

    closedMarketSafetyMarginPercent:
      "2",
  });

assert.equal(
  tooOldDecision.mode,
  "UNAVAILABLE",
);

assert.equal(
  tooOldDecision.reason,
  "RATE_TOO_OLD",
);

assert.equal(
  tooOldDecision.isUsableForSale,
  false,
);

assert.equal(
  tooOldDecision.effectivePricePerGramToman,
  null,
);

const invalidTimestampDecision =
  getMetalRateSaleDecision({
    referencePricePerGramToman:
      "18209300",

    freshness: {
      ageSeconds:
        null,

      isStale:
        true,

      reason:
        "SOURCE_TIME_MISSING",
    },

    closedMarketPricingEnabled:
      true,

    closedMarketMaxAgeMinutes:
      720,

    closedMarketSafetyMarginPercent:
      "2",
  });

assert.equal(
  invalidTimestampDecision.mode,
  "UNAVAILABLE",
);

assert.equal(
  invalidTimestampDecision.reason,
  "SOURCE_TIME_INVALID",
);

assert.equal(
  invalidTimestampDecision.isUsableForSale,
  false,
);

/*
 * بررسی گردکردن رو به بالا:
 * ۲.۵ درصدِ ۱۰۱ تومان برابر ۲.۵۲۵ است
 * و حاشیه امنیت باید ۳ تومان محاسبه شود.
 */
const roundUpDecision =
  getMetalRateSaleDecision({
    referencePricePerGramToman:
      "101",

    freshness: {
      ageSeconds:
        60 * 60,

      isStale:
        true,

      reason:
        "STALE",
    },

    closedMarketPricingEnabled:
      true,

    closedMarketMaxAgeMinutes:
      720,

    closedMarketSafetyMarginPercent:
      "2.5",
  });

assert.equal(
  roundUpDecision.safetyMarginAmountToman,
  "3",
);

assert.equal(
  roundUpDecision.effectivePricePerGramToman,
  "104",
);

console.log(
  "PASS: closed-market metal rates use the configured age limit and exact safety margin.",
);