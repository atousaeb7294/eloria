import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "dotenv";

const args = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const envPath = resolve(option("--env-file") || ".env");
const siteUrl = (option("--site-url") || "https://eloriagallery.ir").replace(/\/$/, "");
const fileEnv = existsSync(envPath) ? parse(readFileSync(envPath, "utf8")) : {};
const env = { ...fileEnv, ...process.env };
const value = key => String(env[key] || "").trim();
const bool = key => value(key).toLowerCase() === "true";
const smsOtpEnabled = bool("ELORIA_CUSTOMER_SMS_OTP_ENABLED");
const secret = new Set([
  "DATABASE_URL", "DIRECT_URL", "ELORIA_ADMIN_PASSWORD_HASH", "ELORIA_ADMIN_SESSION_SECRET",
  "ELORIA_ADMIN_TOTP_SECRET", "CRON_SECRET", "ELORIA_HEALTH_SECRET", "ELORIA_TRACKING_SECRET",
  "ELORIA_PAYMENT_RECEIPT_SECRET", "ELORIA_PAYMENT_START_SECRET", "ELORIA_CUSTOMER_AUTH_SECRET",
  "ELORIA_SUPPORT_CHAT_SECRET", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", "SUPABASE_SERVICE_ROLE_KEY",
  "SMS_IR_API_KEY", "TURNSTILE_SECRET_KEY", "BRS_API_KEY", "ZARINPAL_MERCHANT_ID",
  "ELORIA_SECURITY_ALERT_WEBHOOK_URL",
]);
const required = [
  "DATABASE_URL", "DIRECT_URL", "NEXT_PUBLIC_SITE_URL", "ELORIA_CUSTOMER_AUTH_ENABLED",
  "ELORIA_CUSTOMER_SMS_OTP_ENABLED",
  ...(value("ELORIA_SECURITY_ALERT_MOBILE") || value("ELORIA_SUPPORT_MOBILE") ? ["SMS_IR_LINE_NUMBER"] : []),
  "ELORIA_DYNAMIC_PRICING_ENABLED", "ELORIA_ADMIN_USERNAME", "ELORIA_ADMIN_PASSWORD_HASH",
  "ELORIA_ADMIN_SESSION_SECRET", "ELORIA_ADMIN_TOTP_SECRET", "ELORIA_CUSTOMER_AUTH_SECRET",
  ...(smsOtpEnabled ? ["SMS_IR_API_KEY", "SMS_IR_VERIFY_TEMPLATE_ID", "SMS_IR_VERIFY_PARAMETER"] : []),
  "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "TURNSTILE_SECRET_KEY",
  "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ELORIA_STORAGE_BUCKET", "BRS_API_KEY", "CRON_SECRET",
  "ELORIA_HEALTH_SECRET", "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", "ELORIA_EMBEDDED_METAL_SYNC_ENABLED",
  "ELORIA_EMBEDDED_METAL_SYNC_INTERVAL_MINUTES",
];

console.log("\nELORIA PARSPACK ENV AUDIT (secret values are never printed)\n");
let failed = false;
for (const key of required) {
  const current = value(key);
  const ok = current.length > 0;
  if (!ok) failed = true;
  const shown = secret.has(key) ? (ok ? `[SET ${current.length} chars]` : "[MISSING]") : (ok ? current : "[MISSING]");
  console.log(`${ok ? "OK   " : "ERROR"} ${key.padEnd(45)} ${shown}`);
}

const contracts = [
  ["Admin password hash", /^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/i.test(value("ELORIA_ADMIN_PASSWORD_HASH"))],
  ["Admin TOTP Base32", /^[A-Z2-7]+=*$/i.test(value("ELORIA_ADMIN_TOTP_SECRET")) && value("ELORIA_ADMIN_TOTP_SECRET").length >= 16],
  ["Customer auth enabled", bool("ELORIA_CUSTOMER_AUTH_ENABLED")],
  ["Customer OTP delivery channel", smsOtpEnabled],
  ["SMS.ir Verify provider", !smsOtpEnabled || (value("SMS_IR_API_KEY").length >= 16 && /^\d+$/.test(value("SMS_IR_VERIFY_TEMPLATE_ID")) && /^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(value("SMS_IR_VERIFY_PARAMETER")))],
  ["Dynamic pricing enabled", bool("ELORIA_DYNAMIC_PRICING_ENABLED")],
  ["Embedded metal sync enabled", bool("ELORIA_EMBEDDED_METAL_SYNC_ENABLED")],
  ["Canonical URL", value("NEXT_PUBLIC_SITE_URL") === "https://eloriagallery.ir"],
  ["Real security alert channel", Boolean(value("ELORIA_SECURITY_ALERT_WEBHOOK_URL")) || (/^09\d{9}$/.test(value("ELORIA_SECURITY_ALERT_MOBILE")) && value("SMS_IR_API_KEY").length >= 16 && /^\d+$/.test(value("SMS_IR_LINE_NUMBER")))],
];
console.log("");
for (const [label, ok] of contracts) {
  if (!ok) failed = true;
  console.log(`${ok ? "OK   " : "ERROR"} ${label}`);
}

if (!args.includes("--skip-live")) try {
  const headers = value("ELORIA_HEALTH_SECRET") ? { "x-eloria-health-secret": value("ELORIA_HEALTH_SECRET") } : {};
  const response = await fetch(`${siteUrl}/api/health`, { headers, signal: AbortSignal.timeout(15000) });
  const body = await response.json();
  console.log(`\nLIVE  ${response.status} ${JSON.stringify(body)}`);
  if (!response.ok || body.status !== "ok") failed = true;
} catch (error) {
  console.log(`\nERROR Live health request failed: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

console.log(failed ? "\nRESULT: NOT READY" : "\nRESULT: READY");
process.exitCode = failed ? 1 : 0;
