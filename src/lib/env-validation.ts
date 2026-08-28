type Check = { key: string; required: boolean; valid: boolean; message: string };

function value(key: string): string {
  return process.env[key]?.trim() ?? "";
}
function present(key: string, minimum = 1): boolean {
  return value(key).length >= minimum;
}
function boolFlag(key: string): boolean {
  return value(key).toLowerCase() === "true";
}
function isExplicitBoolean(key: string): boolean {
  return ["true", "false"].includes(value(key).toLowerCase());
}
function isHttpsUrl(key: string): boolean {
  try {
    return new URL(value(key)).protocol === "https:";
  } catch {
    return false;
  }
}
function isLegalContactPhone(key: string): boolean {
  const raw = value(key);
  return /^\+?[0-9][0-9\s()\-]{4,30}$/.test(raw);
}
function isLegalContactEmail(key: string): boolean {
  const raw = value(key);
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw);
}
function isPublicHttpsUrl(key: string): boolean {
  try {
    const url = new URL(value(key));
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:") return false;
    if (host === "localhost" || host === "::1" || host.endsWith(".local")) return false;
    const match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!match) return true;
    const a = Number(match[1]);
    const b = Number(match[2]);
    return !(
      a === 0 || a === 10 || a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  } catch {
    return false;
  }
}
function isNonNegativeInteger(key: string): boolean {
  return /^\d+$/.test(value(key));
}
function isOptionalNonNegativeInteger(key: string): boolean {
  const raw = value(key);
  return !raw || /^\d+$/.test(raw);
}
function isPositiveNumber(key: string): boolean {
  const raw = value(key);
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return false;
  return Number(raw) > 0;
}
function isIntegerInRange(
  key: string,
  minimum: number,
  maximum: number,
): boolean {
  const raw = value(key);
  if (!/^\d+$/.test(raw)) return false;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum;
}
function isPercent(key: string): boolean {
  const raw = value(key);
  if (!/^\d+(?:\.\d+)?$/.test(raw)) return false;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 100;
}
function isThirtyTwoByteBase64(key: string): boolean {
  try {
    const raw = value(key);
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(raw)) return false;
    return Buffer.from(raw, "base64").length === 32;
  } catch {
    return false;
  }
}
function distinctSecrets(values: string[]): boolean {
  const normalized = values.filter(Boolean);
  return (
    normalized.length === values.length &&
    new Set(normalized).size === normalized.length
  );
}
function isTotpSecret(key: string): boolean {
  const raw = value(key).replace(/\s+/g, "").toUpperCase();
  return raw.length >= 16 && /^[A-Z2-7]+=*$/.test(raw);
}
function optionalOfficialHttpsEndpoint(
  key: string,
  allowedHostname: string,
  allowedPathPrefix: string,
): boolean {
  if (!value(key)) return true;
  try {
    const url = new URL(value(key));
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === allowedHostname &&
      url.pathname.startsWith(allowedPathPrefix)
    );
  } catch {
    return false;
  }
}
function optionalBrsEndpoint(key: string): boolean {
  if (!value(key)) return true;
  try {
    const url = new URL(value(key));
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "api.brsapi.ir"
    );
  } catch {
    return false;
  }
}

export function productionEnvironmentChecks(): Check[] {
  const commerceEnabled = boolFlag("ELORIA_COMMERCE_ENABLED");
  const customerAuthEnabled = boolFlag("ELORIA_CUSTOMER_AUTH_ENABLED");
  const dynamicPricingEnabled = boolFlag("ELORIA_DYNAMIC_PRICING_ENABLED");
  const paymentEnabled = boolFlag("ELORIA_PAYMENT_ENABLED");
  const supportEnabled = boolFlag("ELORIA_SUPPORT_ENABLED");
  const supportChatEnabled = boolFlag("ELORIA_SUPPORT_CHAT_ENABLED");
  const legalPagesIndex = boolFlag("ELORIA_LEGAL_PAGES_INDEX");
  const legalIdentityRequired = commerceEnabled || legalPagesIndex;
  const legalPhone = value("ELORIA_LEGAL_SUPPORT_PHONE");
  const legalEmail = value("ELORIA_LEGAL_SUPPORT_EMAIL");
  const legalContactValid =
    isLegalContactPhone("ELORIA_LEGAL_SUPPORT_PHONE") ||
    isLegalContactEmail("ELORIA_LEGAL_SUPPORT_EMAIL");

  const smsEnabled = present("KAVENEGAR_API_KEY");
  const securityAlertMobile = value("ELORIA_SECURITY_ALERT_MOBILE");
  const securityAlertWebhook = value("ELORIA_SECURITY_ALERT_WEBHOOK_URL");
  const securityAlertSmsChannel =
    /^09\d{9}$/.test(securityAlertMobile) && smsEnabled;
  const securityAlertWebhookChannel =
    Boolean(securityAlertWebhook) &&
    isPublicHttpsUrl("ELORIA_SECURITY_ALERT_WEBHOOK_URL");
  const supportMobile = value("ELORIA_SUPPORT_MOBILE");
  const supportWebhook = value("ELORIA_SUPPORT_WEBHOOK_URL");
  const supportSmsChannel = /^09\d{9}$/.test(supportMobile) && smsEnabled;
  const supportWebhookChannel =
    Boolean(supportWebhook) && isPublicHttpsUrl("ELORIA_SUPPORT_WEBHOOK_URL");

  const securityAlertSeverity =
    value("ELORIA_SECURITY_ALERT_MIN_SEVERITY").toUpperCase();
  const securityAlertCooldown = Number.parseInt(
    value("ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS"),
    10,
  );

  const supportTurnstileRequired =
    boolFlag("ELORIA_SUPPORT_TURNSTILE_REQUIRED");
  const turnstileRequired =
    commerceEnabled ||
    customerAuthEnabled ||
    (supportEnabled && supportTurnstileRequired);
  const trustProxy = ["true", "1"].includes(value("ELORIA_TRUST_PROXY"));
  const proxyProvider = value("ELORIA_PROXY_PROVIDER").toLowerCase();

  const secretKeys = [
    "CRON_SECRET",
    "ELORIA_HEALTH_SECRET",
    "ELORIA_ADMIN_SESSION_SECRET",
    "ELORIA_TRACKING_SECRET",
    "ELORIA_PAYMENT_RECEIPT_SECRET",
    ...(customerAuthEnabled ? ["ELORIA_CUSTOMER_AUTH_SECRET"] : []),
    ...(paymentEnabled ? ["ELORIA_PAYMENT_START_SECRET"] : []),
    ...(supportChatEnabled ? ["ELORIA_SUPPORT_CHAT_SECRET"] : []),
  ];

  return [
    { key: "DATABASE_URL", required: true, valid: present("DATABASE_URL", 20), message: "Ø§ØªØµØ§Ù„ PostgreSQL Pool" },
    { key: "DIRECT_URL", required: true, valid: present("DIRECT_URL", 20), message: "Ø§ØªØµØ§Ù„ Ù…Ø³ØªÙ‚ÛŒÙ… Migration" },
    { key: "NEXT_PUBLIC_SITE_URL", required: true, valid: isHttpsUrl("NEXT_PUBLIC_SITE_URL"), message: "Ø¯Ø§Ù…Ù†Ù‡ HTTPS Ø³Ø§ÛŒØª" },

    { key: "ELORIA_COMMERCE_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_COMMERCE_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Commerce Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_CUSTOMER_AUTH_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_CUSTOMER_AUTH_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ø­Ø³Ø§Ø¨ Ù…Ø´ØªØ±ÛŒ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_DYNAMIC_PRICING_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_DYNAMIC_PRICING_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ù‚ÛŒÙ…Øªâ€ŒÚ¯Ø°Ø§Ø±ÛŒ Ù¾ÙˆÛŒØ§ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_PAYMENT_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_PAYMENT_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ù¾Ø±Ø¯Ø§Ø®Øª Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_SUPPORT_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_SUPPORT_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_SUPPORT_CHAT_ENABLED", required: false, valid: !value("ELORIA_SUPPORT_CHAT_ENABLED") || isExplicitBoolean("ELORIA_SUPPORT_CHAT_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ú¯ÙØªâ€ŒÙˆÚ¯ÙˆÛŒ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ø¯Ø± ØµÙˆØ±Øª ØªÙ†Ø¸ÛŒÙ… Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_SUPPORT_CHAT_RETENTION_DAYS", required: supportChatEnabled, valid: !supportChatEnabled || isIntegerInRange("ELORIA_SUPPORT_CHAT_RETENTION_DAYS", 30, 1_095), message: "Ù†Ú¯Ù‡Ø¯Ø§Ø±ÛŒ Ú¯ÙØªâ€ŒÙˆÚ¯ÙˆÛŒ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ø¨Ø§ÛŒØ¯ Ø¨ÛŒÙ† Û³Û° ØªØ§ Û±Û°Û¹Ûµ Ø±ÙˆØ² Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_MEASUREMENT_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_MEASUREMENT_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ø³Ù†Ø¬Ø´ Ù†Ø§Ø´Ù†Ø§Ø³ Ø³Ø§ÛŒØª Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_CUSTOMER_WATCHES_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_CUSTOMER_WATCHES_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ù¾ÛŒÚ¯ÛŒØ±ÛŒ Ù‚ÛŒÙ…Øª Ùˆ Ù…ÙˆØ¬ÙˆØ¯ÛŒ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_CONTENT_AUTOPILOT_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_CONTENT_AUTOPILOT_ENABLED"), message: "ÙØ¹Ø§Ù„/ØºÛŒØ±ÙØ¹Ø§Ù„ Ø¨ÙˆØ¯Ù† Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ø®ÙˆØ¯Ú©Ø§Ø± Ù…Ø­ØªÙˆØ§ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_CONTENT_AUTOPILOT_DAILY_LIMIT", required: true, valid: isIntegerInRange("ELORIA_CONTENT_AUTOPILOT_DAILY_LIMIT", 0, 3), message: "Ø³Ù‚Ù Ø±ÙˆØ²Ø§Ù†Ù‡Ù” Ù¾ÛŒØ´â€ŒÙ†ÙˆÛŒØ³ Ø®ÙˆØ¯Ú©Ø§Ø± Ø¨Ø§ÛŒØ¯ Ø¨ÛŒÙ† ØµÙØ± ØªØ§ Ø³Ù‡ Ø¨Ø§Ø´Ø¯" },

    { key: "ELORIA_ADMIN_USERNAME", required: true, valid: present("ELORIA_ADMIN_USERNAME", 3), message: "Ù†Ø§Ù… Ú©Ø§Ø±Ø¨Ø±ÛŒ Ù…Ø¯ÛŒØ±" },
    { key: "ELORIA_ADMIN_PASSWORD", required: true, valid: present("ELORIA_ADMIN_PASSWORD", 20), message: "Ø±Ù…Ø² Ù‚ÙˆÛŒ Ù…Ø¯ÛŒØ± Ø­Ø¯Ø§Ù‚Ù„ Û²Û° Ú©Ø§Ø±Ø§Ú©ØªØ±" },
    { key: "ELORIA_ADMIN_SESSION_SECRET", required: true, valid: present("ELORIA_ADMIN_SESSION_SECRET", 48), message: "Ú©Ù„ÛŒØ¯ Ù†Ø´Ø³Øª Ù…Ø¯ÛŒØ±" },
    { key: "ELORIA_ADMIN_SESSION_VERSION", required: true, valid: present("ELORIA_ADMIN_SESSION_VERSION", 1), message: "Ù†Ø³Ø®Ù‡ Ø§Ø¨Ø·Ø§Ù„ Ù†Ø´Ø³Øª" },
    { key: "ELORIA_ADMIN_TOTP_SECRET", required: true, valid: isTotpSecret("ELORIA_ADMIN_TOTP_SECRET"), message: "TOTP Ù…Ø¯ÛŒØ± Ø¯Ø± Production Ø§Ø¬Ø¨Ø§Ø±ÛŒ Ø§Ø³Øª" },

    { key: "ELORIA_CUSTOMER_AUTH_SECRET", required: customerAuthEnabled, valid: !customerAuthEnabled || present("ELORIA_CUSTOMER_AUTH_SECRET", 48), message: "Ú©Ù„ÛŒØ¯ Ù†Ø´Ø³Øª Ùˆ OTP Ù…Ø´ØªØ±ÛŒ" },
    { key: "ELORIA_SUPPORT_CHAT_SECRET", required: supportChatEnabled, valid: !supportChatEnabled || present("ELORIA_SUPPORT_CHAT_SECRET", 48), message: "Ú©Ù„ÛŒØ¯ Ù…Ø³ØªÙ‚Ù„ Ù†Ø´Ø³Øª Ú¯ÙØªâ€ŒÙˆÚ¯ÙˆÛŒ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ" },
    { key: "KAVENEGAR_API_KEY", required: customerAuthEnabled || Boolean(securityAlertMobile) || Boolean(supportMobile), valid: !(customerAuthEnabled || Boolean(securityAlertMobile) || Boolean(supportMobile)) || present("KAVENEGAR_API_KEY", 16), message: "Ú©Ù„ÛŒØ¯ Ù¾ÛŒØ§Ù…Ú© Ø¨Ø±Ø§ÛŒ ÙˆØ±ÙˆØ¯/Ù‡Ø´Ø¯Ø§Ø±/Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ SMS" },

    { key: "ELORIA_SUPPORT_TURNSTILE_REQUIRED", required: true, valid: isExplicitBoolean("ELORIA_SUPPORT_TURNSTILE_REQUIRED"), message: "Ù…Ø­Ø§ÙØ¸Øª Turnstile ÙØ±Ù… Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", required: turnstileRequired, valid: !turnstileRequired || present("NEXT_PUBLIC_TURNSTILE_SITE_KEY", 10), message: "Ú©Ù„ÛŒØ¯ Ø¹Ù…ÙˆÙ…ÛŒ Turnstile" },
    { key: "TURNSTILE_SECRET_KEY", required: turnstileRequired, valid: !turnstileRequired || present("TURNSTILE_SECRET_KEY", 10), message: "Ú©Ù„ÛŒØ¯ Ø®ØµÙˆØµÛŒ Turnstile" },

    { key: "ELORIA_SUPPORT_MOBILE", required: Boolean(supportMobile), valid: !supportMobile || /^09\d{9}$/.test(supportMobile), message: "Ø´Ù…Ø§Ø±Ù‡ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ SMS" },
    { key: "ELORIA_SUPPORT_WEBHOOK_URL", required: Boolean(supportWebhook), valid: !supportWebhook || supportWebhookChannel, message: "Webhook Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ Ø¨Ø§ÛŒØ¯ HTTPS Ø¹Ù…ÙˆÙ…ÛŒ Ùˆ Ø§Ù…Ù† Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_SUPPORT_CHANNEL", required: supportEnabled, valid: !supportEnabled || supportSmsChannel || supportWebhookChannel || supportChatEnabled, message: "ÙˆÙ‚ØªÛŒ Ù¾Ø´ØªÛŒØ¨Ø§Ù†ÛŒ ÙØ¹Ø§Ù„ Ø§Ø³Øª Ø­Ø¯Ø§Ù‚Ù„ ÛŒÚ© Ú©Ø§Ù†Ø§Ù„ Ú¯ÙØªâ€ŒÙˆÚ¯ÙˆØŒ SMS ÛŒØ§ HTTPS webhook Ù„Ø§Ø²Ù… Ø§Ø³Øª" },

    { key: "ELORIA_SHIPPING_FLAT_TOMAN", required: commerceEnabled, valid: !commerceEnabled || isNonNegativeInteger("ELORIA_SHIPPING_FLAT_TOMAN"), message: "Ù‡Ø²ÛŒÙ†Ù‡ Ø§Ø±Ø³Ø§Ù„ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ùˆ Ù†Ø§Ù…Ù†ÙÛŒ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_FREE_SHIPPING_FROM_TOMAN", required: commerceEnabled, valid: !commerceEnabled || isOptionalNonNegativeInteger("ELORIA_FREE_SHIPPING_FROM_TOMAN"), message: "Ø¢Ø³ØªØ§Ù†Ù‡ Ø§Ø±Ø³Ø§Ù„ Ø±Ø§ÛŒÚ¯Ø§Ù† Ø¨Ø§ÛŒØ¯ Ø®Ø§Ù„ÛŒ ÛŒØ§ Ø¹Ø¯Ø¯ ØµØ­ÛŒØ­ Ù†Ø§Ù…Ù†ÙÛŒ Ø¨Ø§Ø´Ø¯" },

    { key: "BRS_API_KEY", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || present("BRS_API_KEY", 1), message: "Ú©Ù„ÛŒØ¯ Ù…Ù†Ø¨Ø¹ Ù†Ø±Ø® ÙÙ„Ø²" },
    { key: "BRS_GOLD_API_URL", required: false, valid: optionalBrsEndpoint("BRS_GOLD_API_URL"), message: "Override Ù†Ø±Ø® Ø·Ù„Ø§ ÙÙ‚Ø· HTTPS Ø±ÙˆÛŒ Api.BrsApi.ir Ù…Ø¬Ø§Ø² Ø§Ø³Øª" },
    { key: "BRS_COMMODITY_API_URL", required: false, valid: optionalBrsEndpoint("BRS_COMMODITY_API_URL"), message: "Override Ù†Ø±Ø® Ú©Ø§Ù…ÙˆØ¯ÛŒØªÛŒ ÙÙ‚Ø· HTTPS Ø±ÙˆÛŒ Api.BrsApi.ir Ù…Ø¬Ø§Ø² Ø§Ø³Øª" },

    { key: "ELORIA_GOLD_RATE_MIN_TOMAN", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPositiveNumber("ELORIA_GOLD_RATE_MIN_TOMAN"), message: "Ú©Ù sanity Ù†Ø±Ø® Ø·Ù„Ø§" },
    { key: "ELORIA_GOLD_RATE_MAX_TOMAN", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPositiveNumber("ELORIA_GOLD_RATE_MAX_TOMAN"), message: "Ø³Ù‚Ù sanity Ù†Ø±Ø® Ø·Ù„Ø§" },
    { key: "ELORIA_SILVER_RATE_MIN_TOMAN", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPositiveNumber("ELORIA_SILVER_RATE_MIN_TOMAN"), message: "Ú©Ù sanity Ù†Ø±Ø® Ù†Ù‚Ø±Ù‡" },
    { key: "ELORIA_SILVER_RATE_MAX_TOMAN", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPositiveNumber("ELORIA_SILVER_RATE_MAX_TOMAN"), message: "Ø³Ù‚Ù sanity Ù†Ø±Ø® Ù†Ù‚Ø±Ù‡" },
    { key: "ELORIA_GOLD_RATE_MAX_DEVIATION_PERCENT", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPercent("ELORIA_GOLD_RATE_MAX_DEVIATION_PERCENT"), message: "Ø­Ø¯Ø§Ú©Ø«Ø± Ø¬Ù‡Ø´ Ù…Ø¬Ø§Ø² Ù†Ø±Ø® Ø·Ù„Ø§" },
    { key: "ELORIA_SILVER_RATE_MAX_DEVIATION_PERCENT", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPercent("ELORIA_SILVER_RATE_MAX_DEVIATION_PERCENT"), message: "Ø­Ø¯Ø§Ú©Ø«Ø± Ø¬Ù‡Ø´ Ù…Ø¬Ø§Ø² Ù†Ø±Ø® Ù†Ù‚Ø±Ù‡" },

    { key: "ZARINPAL_MERCHANT_ID", required: paymentEnabled, valid: !paymentEnabled || /^[0-9a-fA-F-]{36}$/.test(value("ZARINPAL_MERCHANT_ID")), message: "Merchant ID Ø²Ø±ÛŒÙ†â€ŒÙ¾Ø§Ù„" },
    { key: "ELORIA_PAYMENT_START_SECRET", required: paymentEnabled, valid: !paymentEnabled || present("ELORIA_PAYMENT_START_SECRET", 48), message: "Ú©Ù„ÛŒØ¯ Ù…Ø³ØªÙ‚Ù„ Ù…Ø¬ÙˆØ² Ø´Ø±ÙˆØ¹ Ù¾Ø±Ø¯Ø§Ø®Øª Guest" },
    { key: "ZARINPAL_API_BASE", required: false, valid: optionalOfficialHttpsEndpoint("ZARINPAL_API_BASE", "payment.zarinpal.com", "/pg/v4/payment"), message: "API Ø²Ø±ÛŒÙ†â€ŒÙ¾Ø§Ù„ ÙÙ‚Ø· Ø±ÙˆÛŒ endpoint Ø±Ø³Ù…ÛŒ HTTPS" },
    { key: "ZARINPAL_STARTPAY_BASE", required: false, valid: optionalOfficialHttpsEndpoint("ZARINPAL_STARTPAY_BASE", "payment.zarinpal.com", "/pg/StartPay"), message: "StartPay Ø²Ø±ÛŒÙ†â€ŒÙ¾Ø§Ù„ ÙÙ‚Ø· Ø±ÙˆÛŒ endpoint Ø±Ø³Ù…ÛŒ HTTPS" },

    { key: "SUPABASE_URL", required: true, valid: isHttpsUrl("SUPABASE_URL"), message: "Ø¢Ø¯Ø±Ø³ Storage" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, valid: present("SUPABASE_SERVICE_ROLE_KEY", 40), message: "Ú©Ù„ÛŒØ¯ Storage" },
    { key: "ELORIA_STORAGE_BUCKET", required: true, valid: present("ELORIA_STORAGE_BUCKET", 2), message: "Ù†Ø§Ù… Bucket ØªØµØ§ÙˆÛŒØ±" },

    { key: "CRON_SECRET", required: true, valid: present("CRON_SECRET", 48), message: "Ú©Ù„ÛŒØ¯ Cron" },
    { key: "ELORIA_HEALTH_SECRET", required: true, valid: present("ELORIA_HEALTH_SECRET", 48), message: "Ú©Ù„ÛŒØ¯ Ù…Ø³ØªÙ‚Ù„ Health" },
    { key: "ELORIA_TRACKING_SECRET", required: true, valid: present("ELORIA_TRACKING_SECRET", 32), message: "Ú©Ù„ÛŒØ¯ Ù„ÛŒÙ†Ú© Ø§Ù…Ù† Ù¾ÛŒÚ¯ÛŒØ±ÛŒ Ø³ÙØ§Ø±Ø´" },
    { key: "ELORIA_PAYMENT_RECEIPT_SECRET", required: true, valid: present("ELORIA_PAYMENT_RECEIPT_SECRET", 32), message: "Ú©Ù„ÛŒØ¯ Ø±Ø³ÛŒØ¯ Ø§Ù…Ù† Ù¾Ø±Ø¯Ø§Ø®Øª" },
    { key: "ELORIA_SECRET_SEPARATION", required: true, valid: distinctSecrets(secretKeys.map(key => value(key))), message: "Ú©Ù„ÛŒØ¯Ù‡Ø§ÛŒ Ø§Ù…Ù†ÛŒØªÛŒ Ø¨Ø§ÛŒØ¯ Ù…Ø³ØªÙ‚Ù„ Ø¨Ø§Ø´Ù†Ø¯" },

    { key: "DATABASE_SSL_MODE", required: true, valid: ["verify-full", "require"].includes(value("DATABASE_SSL_MODE")), message: "Ø§Ø¹ØªØ¨Ø§Ø±Ø³Ù†Ø¬ÛŒ Ú©Ø§Ù…Ù„ TLS Ø¯ÛŒØªØ§Ø¨ÛŒØ³" },
    { key: "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", required: true, valid: isThirtyTwoByteBase64("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"), message: "Ú©Ù„ÛŒØ¯ Ø«Ø§Ø¨Øª Û³Û² Ø¨Ø§ÛŒØªÛŒ Base64 Ø¨Ø±Ø§ÛŒ Server Actions" },
    { key: "ELORIA_DEPLOYMENT_ID", required: true, valid: present("ELORIA_DEPLOYMENT_ID", 6), message: "Ø´Ù†Ø§Ø³Ù‡ Release" },

    { key: "ELORIA_TRUST_PROXY", required: true, valid: trustProxy, message: "Ø¨Ø±Ø§ÛŒ rate-limit Ù…Ø¨ØªÙ†ÛŒ Ø¨Ø± IPØŒ Proxy Ù‚Ø§Ø¨Ù„ Ø§Ø¹ØªÙ…Ø§Ø¯ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ ÙØ¹Ø§Ù„ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_PROXY_PROVIDER", required: trustProxy, valid: !trustProxy || proxyProvider === "cloudflare" || proxyProvider === "generic", message: "Provider Ù…Ø¹ØªØ¨Ø± Ø¨Ø±Ø§ÛŒ Ù‡Ø¯Ø±Ù‡Ø§ÛŒ IP" },
    { key: "ELORIA_RATE_LIMIT_FAILURE_MODE", required: true, valid: value("ELORIA_RATE_LIMIT_FAILURE_MODE").toLowerCase() === "closed", message: "Rate limit Ø¯Ø± Production Ø¨Ø§ÛŒØ¯ fail-closed Ø¨Ø§Ø´Ø¯" },

    { key: "ELORIA_SECURITY_ALERT_MOBILE", required: Boolean(securityAlertMobile), valid: !securityAlertMobile || /^09\d{9}$/.test(securityAlertMobile), message: "Ø´Ù…Ø§Ø±Ù‡ Ù…ÙˆØ¨Ø§ÛŒÙ„ Ù‡Ø´Ø¯Ø§Ø± Ø§Ù…Ù†ÛŒØªÛŒ" },
    { key: "ELORIA_SECURITY_ALERT_WEBHOOK_URL", required: Boolean(securityAlertWebhook), valid: !securityAlertWebhook || securityAlertWebhookChannel, message: "Webhook Ø§Ù…Ù† Ù‡Ø´Ø¯Ø§Ø± Ø§Ù…Ù†ÛŒØªÛŒ" },
    { key: "ELORIA_SECURITY_ALERT_MIN_SEVERITY", required: true, valid: ["INFO", "MEDIUM", "HIGH", "CRITICAL"].includes(securityAlertSeverity), message: "Ø­Ø¯Ø§Ù‚Ù„ Ø³Ø·Ø­ Ù‡Ø´Ø¯Ø§Ø± Ø®Ø§Ø±Ø¬ÛŒ" },
    { key: "ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS", required: true, valid: Number.isFinite(securityAlertCooldown) && securityAlertCooldown >= 30 && securityAlertCooldown <= 3600, message: "Cooldown Ù‡Ø´Ø¯Ø§Ø± Ø§Ù…Ù†ÛŒØªÛŒ Ø¨ÛŒÙ† Û³Û° ØªØ§ Û³Û¶Û°Û° Ø«Ø§Ù†ÛŒÙ‡" },
    { key: "ELORIA_SECURITY_ALERT_CHANNEL", required: true, valid: securityAlertSmsChannel || securityAlertWebhookChannel, message: "Ø­Ø¯Ø§Ù‚Ù„ ÛŒÚ© Ú©Ø§Ù†Ø§Ù„ Ù‡Ø´Ø¯Ø§Ø± Ø§Ù…Ù†ÛŒØªÛŒ SMS ÛŒØ§ HTTPS webhook Ø¨Ø§ÛŒØ¯ ÙØ¹Ø§Ù„ Ø¨Ø§Ø´Ø¯" },

    { key: "ELORIA_LEGAL_SELLER_NAME", required: legalIdentityRequired, valid: !legalIdentityRequired || present("ELORIA_LEGAL_SELLER_NAME", 2), message: "Ù†Ø§Ù… Ù‚Ø§Ù†ÙˆÙ†ÛŒ/ØµÙ†ÙÛŒ ÙØ±ÙˆØ´Ù†Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ ÙØ±ÙˆØ´ ÛŒØ§ Index Ø­Ù‚ÙˆÙ‚ÛŒ" },
    { key: "ELORIA_LEGAL_BUSINESS_ADDRESS", required: legalIdentityRequired, valid: !legalIdentityRequired || present("ELORIA_LEGAL_BUSINESS_ADDRESS", 10), message: "Ù†Ø´Ø§Ù†ÛŒ Ù…Ø­Ù„ ØªØ¬Ø§Ø±ÛŒ/Ú©Ø§Ø±ÛŒ ÙØ±ÙˆØ´Ù†Ø¯Ù‡ Ø¨Ø±Ø§ÛŒ Ø´Ú©Ø§ÛŒØª Ùˆ Ù…Ú©Ø§ØªØ¨Ù‡" },
    { key: "ELORIA_LEGAL_SUPPORT_PHONE", required: Boolean(legalPhone), valid: !legalPhone || isLegalContactPhone("ELORIA_LEGAL_SUPPORT_PHONE"), message: "Ø´Ù…Ø§Ø±Ù‡ ØªÙ…Ø§Ø³ Ø­Ù‚ÙˆÙ‚ÛŒ ÙØ±ÙˆØ´Ú¯Ø§Ù‡ Ø¯Ø± ØµÙˆØ±Øª ØªÙ†Ø¸ÛŒÙ…" },
    { key: "ELORIA_LEGAL_SUPPORT_EMAIL", required: Boolean(legalEmail), valid: !legalEmail || isLegalContactEmail("ELORIA_LEGAL_SUPPORT_EMAIL"), message: "Ø§ÛŒÙ…ÛŒÙ„ ØªÙ…Ø§Ø³ Ø­Ù‚ÙˆÙ‚ÛŒ ÙØ±ÙˆØ´Ú¯Ø§Ù‡ Ø¯Ø± ØµÙˆØ±Øª ØªÙ†Ø¸ÛŒÙ…" },
    { key: "ELORIA_LEGAL_CONTACT", required: legalIdentityRequired, valid: !legalIdentityRequired || legalContactValid, message: "Ø¨Ø±Ø§ÛŒ ÙØ±ÙˆØ´ ÛŒØ§ Index Ø­Ù‚ÙˆÙ‚ÛŒ Ø­Ø¯Ø§Ù‚Ù„ ÛŒÚ© ØªÙ„ÙÙ† ÛŒØ§ Ø§ÛŒÙ…ÛŒÙ„ Ù…Ø¹ØªØ¨Ø± Ù„Ø§Ø²Ù… Ø§Ø³Øª" },

    { key: "ELORIA_LEGAL_PAGES_INDEX", required: true, valid: isExplicitBoolean("ELORIA_LEGAL_PAGES_INDEX"), message: "Index Ø´Ø¯Ù† ØµÙØ­Ø§Øª Ø­Ù‚ÙˆÙ‚ÛŒ Ø¨Ø§ÛŒØ¯ ØµØ±ÛŒØ­ Ø¨Ø§Ø´Ø¯" },
    { key: "ELORIA_MEASUREMENT_RETENTION_DAYS", required: true, valid: isIntegerInRange("ELORIA_MEASUREMENT_RETENTION_DAYS", 30, 730), message: "Ø¨Ø§Ø²Ù‡ Ù†Ú¯Ù‡Ø¯Ø§Ø±ÛŒ Ø³Ù†Ø¬Ø´ Ø±Ø¶Ø§ÛŒØªÛŒ Ø³Ø§ÛŒØª" },
  ];
}

export function assertProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;
  const failed = productionEnvironmentChecks().filter(
    check => check.required && !check.valid,
  );
  if (failed.length) {
    throw new Error(
      `Ù…ØªØºÛŒØ±Ù‡Ø§ÛŒ Ù…Ø­ÛŒØ·ÛŒ Ù†Ø§Ù‚Øµ ÛŒØ§ Ù†Ø§Ù…Ø¹ØªØ¨Ø±: ${failed.map(item => item.key).join(", ")}`,
    );
  }
}

