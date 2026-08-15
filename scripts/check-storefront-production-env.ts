import "dotenv/config";

const errors: string[] = [];
const warnings: string[] = [];
const value = (name: string) => process.env[name]?.trim() ?? "";

const siteUrl = value("NEXT_PUBLIC_SITE_URL");
if (!/^https:\/\//i.test(siteUrl) || /(?:\.local|\.example)(?:\/|$)/i.test(siteUrl)) {
  errors.push("NEXT_PUBLIC_SITE_URL must be the real HTTPS production origin (not .local/.example).");
}

if (value("ELORIA_CUSTOMER_AUTH_SECRET").length < 48) {
  errors.push("ELORIA_CUSTOMER_AUTH_SECRET must be a separate random secret of at least 48 characters.");
}
if (value("ELORIA_CUSTOMER_OTP_DEV_CODE")) {
  errors.push("ELORIA_CUSTOMER_OTP_DEV_CODE must be unset in production.");
}
if (value("KAVENEGAR_API_KEY").length < 16) {
  errors.push("KAVENEGAR_API_KEY is required for real customer OTP and transactional SMS.");
}

const merchant = value("ZARINPAL_MERCHANT_ID");
if (!merchant || /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(merchant)) {
  errors.push("ZARINPAL_MERCHANT_ID must be configured with the real merchant ID.");
}

if (!value("NEXT_PUBLIC_TURNSTILE_SITE_KEY") || !value("TURNSTILE_SECRET_KEY")) {
  errors.push("Cloudflare Turnstile site/secret keys are required for production anti-abuse protection.");
}

if (!/^\d+$/.test(value("ELORIA_SHIPPING_FLAT_TOMAN"))) {
  errors.push("ELORIA_SHIPPING_FLAT_TOMAN must be explicitly set to a non-negative Toman amount; use 0 only if shipping is intentionally free.");
}
const freeFrom = value("ELORIA_FREE_SHIPPING_FROM_TOMAN");
if (freeFrom && !/^\d+$/.test(freeFrom)) {
  errors.push("ELORIA_FREE_SHIPPING_FROM_TOMAN must be empty or a non-negative integer amount in Toman.");
}

if (!value("ELORIA_SUPPORT_MOBILE") && !value("ELORIA_SUPPORT_WEBHOOK_URL")) {
  warnings.push("No ELORIA_SUPPORT_MOBILE or ELORIA_SUPPORT_WEBHOOK_URL is configured; contact delivery must still be covered by the base production gate.");
}

for (const warning of warnings) console.warn(`WARN  ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`FAIL  ${error}`);
  process.exit(1);
}
console.log("PASS  Eloria V3 real-store production configuration gate");
