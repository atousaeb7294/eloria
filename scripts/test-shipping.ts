import assert from "node:assert/strict";
import { calculateShipping } from "../src/lib/shipping";

const beforeFlat = process.env.ELORIA_SHIPPING_FLAT_TOMAN;
const beforeFree = process.env.ELORIA_FREE_SHIPPING_FROM_TOMAN;
try {
  process.env.ELORIA_SHIPPING_FLAT_TOMAN = "85000";
  process.env.ELORIA_FREE_SHIPPING_FROM_TOMAN = "5000000";
  assert.deepEqual(calculateShipping("1000000"), { shippingToman: "85000", freeShippingApplied: false });
  assert.deepEqual(calculateShipping("5000000"), { shippingToman: "0", freeShippingApplied: true });
  process.env.ELORIA_SHIPPING_FLAT_TOMAN = "0";
  delete process.env.ELORIA_FREE_SHIPPING_FROM_TOMAN;
  assert.deepEqual(calculateShipping("1000"), { shippingToman: "0", freeShippingApplied: false });
  console.log("PASS  Server-side shipping policy");
} finally {
  if (beforeFlat === undefined) delete process.env.ELORIA_SHIPPING_FLAT_TOMAN; else process.env.ELORIA_SHIPPING_FLAT_TOMAN = beforeFlat;
  if (beforeFree === undefined) delete process.env.ELORIA_FREE_SHIPPING_FROM_TOMAN; else process.env.ELORIA_FREE_SHIPPING_FROM_TOMAN = beforeFree;
}
