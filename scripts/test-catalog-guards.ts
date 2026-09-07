import assert from "node:assert/strict";

import {
  maxCatalogPage,
  normalizeCatalogPage,
} from "../src/lib/catalog-pagination";
import {
  getRecentlyUsedCacheEntry,
  setBoundedExpiringCacheEntry,
} from "../src/lib/expiring-cache";

assert.equal(
  normalizeCatalogPage(
    undefined,
  ),
  1,
);
assert.equal(
  normalizeCatalogPage(
    -20,
  ),
  1,
);
assert.equal(
  normalizeCatalogPage(
    Number.POSITIVE_INFINITY,
  ),
  1,
);
assert.equal(
  normalizeCatalogPage(
    maxCatalogPage + 1,
  ),
  maxCatalogPage,
);

const cache =
  new Map<string, {
    value: number;
    staleUntil: number;
  }>();

setBoundedExpiringCacheEntry(
  cache,
  "expired",
  { value: 0, staleUntil: 10 },
  2,
  11,
);
setBoundedExpiringCacheEntry(
  cache,
  "first",
  { value: 1, staleUntil: 100 },
  2,
  11,
);
setBoundedExpiringCacheEntry(
  cache,
  "second",
  { value: 2, staleUntil: 100 },
  2,
  11,
);

assert.equal(
  cache.has(
    "expired",
  ),
  false,
);
assert.equal(
  getRecentlyUsedCacheEntry(
    cache,
    "first",
  )?.value,
  1,
);

setBoundedExpiringCacheEntry(
  cache,
  "third",
  { value: 3, staleUntil: 100 },
  2,
  11,
);

assert.deepEqual(
  [...cache.keys()],
  ["first", "third"],
);

assert.throws(
  () =>
    setBoundedExpiringCacheEntry(
      cache,
      "invalid",
      { value: 4, staleUntil: 100 },
      0,
      11,
    ),
  RangeError,
);

console.log(
  "PASS  Catalog pagination and bounded cache guards",
);
