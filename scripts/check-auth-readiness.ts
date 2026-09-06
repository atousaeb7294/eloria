import "dotenv/config";
import { getCustomerAuthChannelAvailability } from "../src/lib/customer-auth-channels";

type Check = { label: string; ok: boolean; note: string };

const value = (key: string) => process.env[key]?.trim() ?? "";
const customerChannels = getCustomerAuthChannelAvailability();
const checks: Check[] = [
  {
    label: "Admin password hash",
    ok: /^scrypt\$[^$]+\$[a-f0-9]+$/i.test(value("ELORIA_ADMIN_PASSWORD_HASH")),
    note: "ELORIA_ADMIN_PASSWORD_HASH must be a generated scrypt value.",
  },
  {
    label: "No legacy password conflict",
    ok: !(value("ELORIA_ADMIN_PASSWORD_HASH") && value("ELORIA_ADMIN_PASSWORD")),
    note: "Keep only the hash; delete ELORIA_ADMIN_PASSWORD when a hash exists.",
  },
  {
    label: "Admin session secret",
    ok: value("ELORIA_ADMIN_SESSION_SECRET").length >= 48,
    note: "Use a random secret of at least 48 characters.",
  },
  {
    label: "Admin TOTP",
    ok: /^[A-Z2-7]+=*$/i.test(value("ELORIA_ADMIN_TOTP_SECRET")),
    note: "Add the Base32 secret to an authenticator and keep server time synchronized.",
  },
  {
    label: "Customer OTP delivery",
    ok: customerChannels.preferredChannel !== null,
    note: "Enable the SMS.ir Verify provider and configure its API key and template.",
  },
  {
    label: "Turnstile keys",
    ok: Boolean(value("NEXT_PUBLIC_TURNSTILE_SITE_KEY") && value("TURNSTILE_SECRET_KEY")),
    note: "Both public and secret Cloudflare Turnstile keys are required.",
  },
  {
    label: "Public URL",
    ok: /^https:\/\//.test(value("NEXT_PUBLIC_SITE_URL")),
    note: "Use the canonical HTTPS site URL without a trailing path.",
  },
];

for (const check of checks) {
  console.log(`${check.ok ? "OK   " : "ERROR"} ${check.label} — ${check.note}`);
}

if (checks.some((check) => !check.ok)) {
  console.error("\nAuthentication readiness check failed. No secret values were printed.");
  process.exit(1);
}

console.log("\nAuthentication configuration is structurally ready. Provider/domain status still requires a live test.");
