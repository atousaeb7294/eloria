import {
  assessMetalRateAnomaly,
} from "../src/lib/metal-rate-anomaly";

function expect(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(message);
  }
}

process.env.ELORIA_GOLD_RATE_MIN_TOMAN =
  "1000000";
process.env.ELORIA_GOLD_RATE_MAX_TOMAN =
  "1000000000";
process.env.ELORIA_GOLD_RATE_MAX_DEVIATION_PERCENT =
  "12";

const baseline = 20_000_000;

expect(
  assessMetalRateAnomaly({
    material: "GOLD",
    incomingPricePerGramToman:
      20_500_000,
    currentPricePerGramToman:
      baseline,
  }).safe,
  "Normal gold movement must be accepted.",
);

expect(
  !assessMetalRateAnomaly({
    material: "GOLD",
    incomingPricePerGramToman:
      10_000_000,
    currentPricePerGramToman:
      baseline,
  }).safe,
  "50% downward anomaly must be rejected.",
);

expect(
  !assessMetalRateAnomaly({
    material: "GOLD",
    incomingPricePerGramToman:
      40_000_000,
    currentPricePerGramToman:
      baseline,
  }).safe,
  "100% upward anomaly must be rejected.",
);

expect(
  !assessMetalRateAnomaly({
    material: "GOLD",
    incomingPricePerGramToman:
      100,
    currentPricePerGramToman:
      null,
  }).safe,
  "First-rate absolute sanity floor must reject absurd values.",
);

console.log(
  "PASS  Metal-rate anomaly guard",
);
