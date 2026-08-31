import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { getCustomerAuthChannelAvailability } from "../src/lib/customer-auth-channels";
import {
  getAllowedTurnstileHostnames,
  isTurnstileHostnameAllowed,
} from "../src/lib/security/turnstile";

const exactHosts = getAllowedTurnstileHostnames(
  "https://eloriagallery.ir",
  "https://www.eloriagallery.ir,not-a-url",
);

assert.deepEqual(exactHosts.sort(), ["eloriagallery.ir", "www.eloriagallery.ir"]);
assert.equal(isTurnstileHostnameAllowed("eloriagallery.ir", exactHosts, true), true);
assert.equal(isTurnstileHostnameAllowed("www.eloriagallery.ir", exactHosts, true), true);
assert.equal(isTurnstileHostnameAllowed("evil.example", exactHosts, true), false);
assert.equal(isTurnstileHostnameAllowed("", exactHosts, true), false);

assert.deepEqual(
  getCustomerAuthChannelAvailability({
    ELORIA_CUSTOMER_EMAIL_OTP_ENABLED: "true",
    RESEND_API_KEY: "re_1234567890123456",
    ELORIA_EMAIL_FROM: "Eloria <login@eloriagallery.ir>",
    ELORIA_CUSTOMER_SMS_OTP_ENABLED: "false",
  }),
  {
    emailEnabled: true,
    smsEnabled: false,
    preferredChannel: "EMAIL",
  },
);

assert.deepEqual(
  getCustomerAuthChannelAvailability({
    ELORIA_CUSTOMER_EMAIL_OTP_ENABLED: "false",
    ELORIA_CUSTOMER_SMS_OTP_ENABLED: "true",
    KAVENEGAR_API_KEY: "1234567890123456",
  }),
  {
    emailEnabled: false,
    smsEnabled: true,
    preferredChannel: "SMS",
  },
);

assert.equal(
  getCustomerAuthChannelAvailability({
    ELORIA_CUSTOMER_EMAIL_OTP_ENABLED: "true",
    ELORIA_CUSTOMER_SMS_OTP_ENABLED: "true",
  }).preferredChannel,
  null,
);

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const header = source("src/components/site-header.tsx");
assert.equal(header.includes("onMouseEnter={openWorldMenu}"), false);
assert.equal(header.includes("onFocusCapture={openWorldMenu}"), false);
assert.equal(header.includes('aria-expanded={worldOpen}'), true);

const livePriceCard = source("src/components/product-card-live-price.tsx");
assert.equal(livePriceCard.includes('cache: "no-store"'), true);
assert.equal(livePriceCard.includes("if (initialPriceToman)"), false);

const productPage = source("src/app/[locale]/products/[slug]/page.tsx");
assert.equal(productPage.includes("to_jsonb(product_row)"), true);
assert.equal(productPage.includes("disabled={!canPurchase}"), true);

for (const migration of [
  "prisma/migrations/20260825070000_add_product_myth_fields/migration.sql",
  "prisma/migrations/20260825080000_add_product_legend_fields/migration.sql",
]) {
  assert.match(source(migration), /add column if not exists/i);
}

console.log("PASS  Critical storefront regression contracts");
