import assert from "node:assert/strict";

import {
  CustomerPasswordError,
  hashCustomerPassword,
  normalizeCustomerPassword,
  verifyCustomerPassword,
} from "../src/lib/customer-password";

const password = "Eloria-Password-123456!";
const hash = hashCustomerPassword(password);

assert.match(hash, /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i);
assert.equal(verifyCustomerPassword(password, hash), true);
assert.equal(verifyCustomerPassword("wrong-password-123", hash), false);
assert.equal(verifyCustomerPassword(password, null), false);
assert.equal(normalizeCustomerPassword(password), password);

assert.throws(
  () => normalizeCustomerPassword("short"),
  CustomerPasswordError,
);

assert.throws(
  () => normalizeCustomerPassword("        "),
  CustomerPasswordError,
);

console.log("PASS  Customer password hashing, verification, and validation");
