import assert from "node:assert/strict";
import { calculateShipping } from "../src/lib/shipping";
process.env.ELORIA_SHIPPING_FLAT_TOMAN="0";
process.env.ELORIA_FREE_SHIPPING_FROM_TOMAN="1";
for (const subtotal of ["1","1000000","5000000","999999999999"]) {
  assert.deepEqual(calculateShipping(subtotal),{shippingToman:"170000",freeShippingApplied:false});
}
assert.equal(calculateShipping("0").shippingToman,"0");
assert.throws(()=>calculateShipping("-1"));
console.log("PASS fixed delivery per nonempty order regardless of retired env settings");
