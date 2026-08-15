function parseMoneyEnv(name: string, fallback: bigint): bigint {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  if (!/^\d+$/.test(raw)) throw new Error(`${name} باید یک عدد صحیح نامنفی بر حسب تومان باشد.`);
  return BigInt(raw);
}

export type ShippingQuote = {
  shippingToman: string;
  freeShippingApplied: boolean;
};

/**
 * Shipping is always calculated server-side. The current production policy is
 * intentionally simple and deterministic: a flat fee with an optional
 * free-shipping threshold. More carrier-specific policies can be introduced
 * later without trusting browser-submitted totals.
 */
export function calculateShipping(subtotalToman: string | bigint): ShippingQuote {
  const subtotal = typeof subtotalToman === "bigint" ? subtotalToman : BigInt(subtotalToman);
  if (subtotal < 0n) throw new Error("مبلغ سبد خرید برای محاسبه ارسال معتبر نیست.");

  const flat = parseMoneyEnv("ELORIA_SHIPPING_FLAT_TOMAN", 0n);
  const freeFromRaw = process.env.ELORIA_FREE_SHIPPING_FROM_TOMAN?.trim();
  const freeFrom = freeFromRaw ? parseMoneyEnv("ELORIA_FREE_SHIPPING_FROM_TOMAN", 0n) : null;
  const freeShippingApplied = freeFrom !== null && freeFrom > 0n && subtotal >= freeFrom;

  return {
    shippingToman: (freeShippingApplied ? 0n : flat).toString(),
    freeShippingApplied,
  };
}
