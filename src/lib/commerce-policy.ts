/** All money is integer toman. Delivery is per order; packaging is per piece. */
export const PACKAGING_TOMAN = 70000n;
export const DELIVERY_TOMAN = 170000n;
export const SILVER_PRICING_DIVISOR = 10.31;
export const SILVER_PRICING_BASIS = "ELORIA_SILVER_10_31_V2";

/** Compare the old standard-ounce rate on the new commercial basis, preserving anomaly checks. */
export function silverComparableBaseline(input: {
  material: string; currentSource?: string | null; incomingSource: string;
  currentPayload: unknown; incomingPayload: unknown; currentPrice: number;
}): number {
  const current = input.currentPayload as { pricingBasis?: unknown; silverOunce?: unknown; usd?: unknown } | null;
  const incoming = input.incomingPayload as { pricingBasis?: unknown } | null;
  if (input.material === "SILVER" && input.currentSource === "BRS_API" && input.incomingSource === "BRS_API" &&
      !current?.pricingBasis && current?.silverOunce && current?.usd && incoming?.pricingBasis === SILVER_PRICING_BASIS) {
    return Math.round(input.currentPrice * 31.1034768 / SILVER_PRICING_DIVISOR);
  }
  return input.currentPrice;
}
