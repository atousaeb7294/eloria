import assert from "node:assert/strict";

import {
  getMetalRateSaleDecision,
} from "../src/lib/metal-rate-sale-policy";

function decide({
  material,
  ageHours,
  configuredMinimumPercent,
  maxAgeMinutes = 14400,
}: {
  material: "GOLD" | "SILVER";
  ageHours: number;
  configuredMinimumPercent: string;
  maxAgeMinutes?: number;
}) {
  return getMetalRateSaleDecision({
    material,
    referencePricePerGramToman: "100000",
    freshness: {
      ageSeconds: ageHours * 60 * 60,
      isStale: true,
      reason: "STALE",
    },
    closedMarketPricingEnabled: true,
    closedMarketMaxAgeMinutes: maxAgeMinutes,
    closedMarketSafetyMarginPercent: configuredMinimumPercent,
  });
}

const liveDecision =
  getMetalRateSaleDecision({
    material: "GOLD",
    referencePricePerGramToman: "18209300",
    freshness: {
      ageSeconds: 5 * 60,
      isStale: false,
      reason: "FRESH",
    },
    closedMarketPricingEnabled: true,
    closedMarketMaxAgeMinutes: 14400,
    closedMarketSafetyMarginPercent: "3",
  });

assert.equal(liveDecision.mode, "LIVE");
assert.equal(liveDecision.isUsableForSale, true);
assert.equal(liveDecision.effectivePricePerGramToman, "18209300");
assert.equal(liveDecision.appliedSafetyMarginPercent, "0");

const gold24 = decide({
  material: "GOLD",
  ageHours: 12,
  configuredMinimumPercent: "3",
});
assert.equal(gold24.appliedSafetyMarginPercent, "0");
assert.equal(gold24.effectivePricePerGramToman, "100000");

const gold48 = decide({
  material: "GOLD",
  ageHours: 30,
  configuredMinimumPercent: "3",
});
assert.equal(gold48.appliedSafetyMarginPercent, "0");
assert.equal(gold48.effectivePricePerGramToman, "100000");

const gold72 = decide({
  material: "GOLD",
  ageHours: 60,
  configuredMinimumPercent: "3",
});
assert.equal(gold72.appliedSafetyMarginPercent, "0");
assert.equal(gold72.effectivePricePerGramToman, "100000");

const gold96 = decide({
  material: "GOLD",
  ageHours: 80,
  configuredMinimumPercent: "3",
});
assert.equal(gold96.appliedSafetyMarginPercent, "0");
assert.equal(gold96.effectivePricePerGramToman, "100000");

const silver24 = decide({
  material: "SILVER",
  ageHours: 12,
  configuredMinimumPercent: "5",
});
assert.equal(silver24.appliedSafetyMarginPercent, "0");
assert.equal(silver24.effectivePricePerGramToman, "100000");

const silver48 = decide({
  material: "SILVER",
  ageHours: 30,
  configuredMinimumPercent: "5",
});
assert.equal(silver48.appliedSafetyMarginPercent, "0");
assert.equal(silver48.effectivePricePerGramToman, "100000");

const silver72 = decide({
  material: "SILVER",
  ageHours: 60,
  configuredMinimumPercent: "5",
});
assert.equal(silver72.appliedSafetyMarginPercent, "0");
assert.equal(silver72.effectivePricePerGramToman, "100000");

const silver96 = decide({
  material: "SILVER",
  ageHours: 80,
  configuredMinimumPercent: "5",
});
assert.equal(silver96.appliedSafetyMarginPercent, "0");
assert.equal(silver96.effectivePricePerGramToman, "100000");

const goldTenDays = decide({
  material: "GOLD",
  ageHours: 175,
  configuredMinimumPercent: "3",
});
assert.equal(goldTenDays.appliedSafetyMarginPercent, "0");
assert.equal(goldTenDays.effectivePricePerGramToman, "100000");

const silverTenDays = decide({
  material: "SILVER",
  ageHours: 175,
  configuredMinimumPercent: "5",
});
assert.equal(silverTenDays.appliedSafetyMarginPercent, "0");
assert.equal(silverTenDays.effectivePricePerGramToman, "100000");

const configuredMinimumWins = decide({
  material: "GOLD",
  ageHours: 12,
  configuredMinimumPercent: "6.5",
});
assert.equal(configuredMinimumWins.appliedSafetyMarginPercent, "0");
assert.equal(configuredMinimumWins.effectivePricePerGramToman, "100000");

const tooOldDecision = decide({
  material: "GOLD",
  ageHours: 241,
  configuredMinimumPercent: "3",
});
assert.equal(tooOldDecision.mode, "CLOSED_MARKET");
assert.equal(tooOldDecision.reason, "CLOSED_MARKET_RATE");
assert.equal(tooOldDecision.isUsableForSale, true);
assert.equal(tooOldDecision.effectivePricePerGramToman, "100000");

const invalidTimestampDecision =
  getMetalRateSaleDecision({
    material: "GOLD",
    referencePricePerGramToman: "18209300",
    freshness: {
      ageSeconds: null,
      isStale: true,
      reason: "SOURCE_TIME_MISSING",
    },
    closedMarketPricingEnabled: true,
    closedMarketMaxAgeMinutes: 14400,
    closedMarketSafetyMarginPercent: "3",
  });
assert.equal(invalidTimestampDecision.mode, "UNAVAILABLE");
assert.equal(invalidTimestampDecision.reason, "SOURCE_TIME_INVALID");
assert.equal(invalidTimestampDecision.isUsableForSale, false);

const roundUpDecision =
  getMetalRateSaleDecision({
    material: "GOLD",
    referencePricePerGramToman: "101",
    freshness: {
      ageSeconds: 60 * 60,
      isStale: true,
      reason: "STALE",
    },
    closedMarketPricingEnabled: true,
    closedMarketMaxAgeMinutes: 14400,
    closedMarketSafetyMarginPercent: "3",
  });
assert.equal(roundUpDecision.safetyMarginAmountToman, "0");
assert.equal(roundUpDecision.effectivePricePerGramToman, "101");

console.log(
  "PASS: closed-market rates keep the last recorded price without a margin.",
);
