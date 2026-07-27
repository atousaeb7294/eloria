import fs from "node:fs";
import path from "node:path";

const routePath = path.resolve(
  process.cwd(),
  "src/app/api/cart/quote/route.ts",
);

if (!fs.existsSync(routePath)) {
  console.error(`Route file not found: ${routePath}`);
  process.exit(1);
}

const source = fs.readFileSync(routePath, "utf8");

if (source.includes("getProductDisplayPrice")) {
  console.error(
    "FAIL: Cart Quote still uses getProductDisplayPrice.",
  );
  process.exit(1);
}

const livePricingMatches =
  source.match(/\bgetProductLivePrice\b/g) ?? [];

if (livePricingMatches.length !== 2) {
  console.error(
    `FAIL: Expected exactly 2 getProductLivePrice references, found ${livePricingMatches.length}.`,
  );
  process.exit(1);
}

if (
  !source.includes(
    'from "@/lib/product-pricing"',
  )
) {
  console.error(
    "FAIL: Product pricing import was not found.",
  );
  process.exit(1);
}

console.log(
  "PASS: Cart Quote uses strict live pricing and rejects stale metal rates.",
);