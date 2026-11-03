import { DELIVERY_TOMAN } from "@/lib/commerce-policy";
export type ShippingMethod = "POST" | "TIPAX";
export function parseShippingMethod(value: unknown): ShippingMethod | null {
  if (value === undefined || value === "POST") return "POST";
  return value === "TIPAX" ? "TIPAX" : null;
}

export function storedShippingMethod(snapshot: unknown): ShippingMethod | null {
  if (!snapshot || typeof snapshot !== "object" || !("shippingMethod" in snapshot)) return null;
  return parseShippingMethod(snapshot.shippingMethod);
}

export type ShippingQuote = { shippingToman: string; freeShippingApplied: boolean };
/** Fixed delivery per order, never per gram or cart line. */
export function calculateShipping(subtotalToman: string | bigint, method: ShippingMethod = "POST"): ShippingQuote {
  const subtotal = BigInt(subtotalToman);
  if (subtotal < 0n) throw new Error("مبلغ سبد خرید معتبر نیست.");
  return { shippingToman: subtotal === 0n || method === "TIPAX" ? "0" : DELIVERY_TOMAN.toString(), freeShippingApplied: false };
}
