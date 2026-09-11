import { DELIVERY_TOMAN } from "@/lib/commerce-policy";
export type ShippingQuote = { shippingToman: string; freeShippingApplied: boolean };
/** Fixed delivery per order, never per gram or cart line. */
export function calculateShipping(subtotalToman: string | bigint): ShippingQuote {
  const subtotal = BigInt(subtotalToman);
  if (subtotal < 0n) throw new Error("مبلغ سبد خرید معتبر نیست.");
  return { shippingToman: subtotal === 0n ? "0" : DELIVERY_TOMAN.toString(), freeShippingApplied: false };
}
