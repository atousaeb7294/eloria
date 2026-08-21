import assert from "node:assert/strict";

import {
  hasMatchingCheckoutIdempotencyOwner,
} from "../src/lib/checkout-idempotency";

assert.equal(
  hasMatchingCheckoutIdempotencyOwner(
    "09121234567",
    "09121234567",
  ),
  true,
);
assert.equal(
  hasMatchingCheckoutIdempotencyOwner(
    "09121234567",
    "09351234567",
  ),
  false,
);
assert.equal(
  hasMatchingCheckoutIdempotencyOwner(
    null,
    "09121234567",
  ),
  false,
);

console.log(
  "PASS  Checkout idempotency owner isolation",
);
