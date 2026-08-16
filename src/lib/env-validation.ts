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
  ];

  return [
    { key: "DATABASE_URL", required: true, valid: present("DATABASE_URL", 20), message: "اتصال PostgreSQL Pool" },
    { key: "DIRECT_URL", required: true, valid: present("DIRECT_URL", 20), message: "اتصال مستقیم Migration" },
    { key: "NEXT_PUBLIC_SITE_URL", required: true, valid: isHttpsUrl("NEXT_PUBLIC_SITE_URL"), message: "دامنه HTTPS سایت" },

    { key: "ELORIA_COMMERCE_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_COMMERCE_ENABLED"), message: "فعال/غیرفعال بودن Commerce باید صریح باشد" },
    { key: "ELORIA_CUSTOMER_AUTH_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_CUSTOMER_AUTH_ENABLED"), message: "فعال/غیرفعال بودن حساب مشتری باید صریح باشد" },
    { key: "ELORIA_DYNAMIC_PRICING_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_DYNAMIC_PRICING_ENABLED"), message: "فعال/غیرفعال بودن قیمت‌گذاری پویا باید صریح باشد" },
    { key: "ELORIA_PAYMENT_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_PAYMENT_ENABLED"), message: "فعال/غیرفعال بودن پرداخت باید صریح باشد" },
    { key: "ELORIA_SUPPORT_ENABLED", required: true, valid: isExplicitBoolean("ELORIA_SUPPORT_ENABLED"), message: "فعال/غیرفعال بودن پشتیبانی باید صریح باشد" },

    { key: "ELORIA_ADMIN_USERNAME", required: true, valid: present("ELORIA_ADMIN_USERNAME", 3), message: "نام کاربری مدیر" },
    { key: "ELORIA_ADMIN_PASSWORD", required: true, valid: present("ELORIA_ADMIN_PASSWORD", 20), message: "رمز قوی مدیر حداقل ۲۰ کاراکتر" },
    { key: "ELORIA_ADMIN_SESSION_SECRET", required: true, valid: present("ELORIA_ADMIN_SESSION_SECRET", 48), message: "کلید نشست مدیر" },
    { key: "ELORIA_ADMIN_SESSION_VERSION", required: true, valid: present("ELORIA_ADMIN_SESSION_VERSION", 1), message: "نسخه ابطال نشست" },
    { key: "ELORIA_ADMIN_TOTP_SECRET", required: true, valid: isTotpSecret("ELORIA_ADMIN_TOTP_SECRET"), message: "TOTP مدیر در Production اجباری است" },

    { key: "ELORIA_CUSTOMER_AUTH_SECRET", required: customerAuthEnabled, valid: !customerAuthEnabled || present("ELORIA_CUSTOMER_AUTH_SECRET", 48), message: "کلید نشست و OTP مشتری" },
    { key: "KAVENEGAR_API_KEY", required: customerAuthEnabled || Boolean(securityAlertMobile) || Boolean(supportMobile), valid: !(customerAuthEnabled || Boolean(securityAlertMobile) || Boolean(supportMobile)) || present("KAVENEGAR_API_KEY", 16), message: "کلید پیامک برای ورود/هشدار/پشتیبانی SMS" },

    { key: "ELORIA_SUPPORT_TURNSTILE_REQUIRED", required: true, valid: isExplicitBoolean("ELORIA_SUPPORT_TURNSTILE_REQUIRED"), message: "محافظت Turnstile فرم پشتیبانی باید صریح باشد" },
    { key: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", required: turnstileRequired, valid: !turnstileRequired || present("NEXT_PUBLIC_TURNSTILE_SITE_KEY", 10), message: "کلید عمومی Turnstile" },
    { key: "TURNSTILE_SECRET_KEY", required: turnstileRequired, valid: !turnstileRequired || present("TURNSTILE_SECRET_KEY", 10), message: "کلید خصوصی Turnstile" },

    { key: "ELORIA_SUPPORT_MOBILE", required: Boolean(supportMobile), valid: !supportMobile || /^09\d{9}$/.test(supportMobile), message: "شماره پشتیبانی SMS" },
    { key: "ELORIA_SUPPORT_WEBHOOK_URL", required: Boolean(supportWebhook), valid: !supportWebhook || supportWebhookChannel, message: "Webhook پشتیبانی باید HTTPS عمومی و امن باشد" },
    { key: "ELORIA_SUPPORT_CHANNEL", required: supportEnabled, valid: !supportEnabled || supportSmsChannel || supportWebhookChannel, message: "وقتی پشتیبانی فعال است حداقل یک کانال SMS یا HTTPS webhook لازم است" },

    { key: "ELORIA_SHIPPING_FLAT_TOMAN", required: commerceEnabled, valid: !commerceEnabled || isNonNegativeInteger("ELORIA_SHIPPING_FLAT_TOMAN"), message: "هزینه ارسال باید صریح و نامنفی باشد" },
    { key: "ELORIA_FREE_SHIPPING_FROM_TOMAN", required: commerceEnabled, valid: !commerceEnabled || isOptionalNonNegativeInteger("ELORIA_FREE_SHIPPING_FROM_TOMAN"), message: "آستانه ارسال رایگان باید خالی یا عدد صحیح نامنفی باشد" },

    { key: "BRS_API_KEY", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || present("BRS_API_KEY", 1), message: "کلید منبع نرخ فلز" },
    { key: "BRS_GOLD_API_URL", required: false, valid: optionalBrsEndpoint("BRS_GOLD_API_URL"), message: "Override نرخ طلا فقط HTTPS روی Api.BrsApi.ir مجاز است" },
    { key: "BRS_COMMODITY_API_URL", required: false, valid: optionalBrsEndpoint("BRS_COMMODITY_API_URL"), message: "Override نرخ کامودیتی فقط HTTPS روی Api.BrsApi.ir مجاز است" },

    { key: "ELORIA_GOLD_RATE_MIN_TOMAN", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPositiveNumber("ELORIA_GOLD_RATE_MIN_TOMAN"), message: "کف sanity نرخ طلا" },
    { key: "ELORIA_GOLD_RATE_MAX_TOMAN", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPositiveNumber("ELORIA_GOLD_RATE_MAX_TOMAN"), message: "سقف sanity نرخ طلا" },
    { key: "ELORIA_SILVER_RATE_MIN_TOMAN", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPositiveNumber("ELORIA_SILVER_RATE_MIN_TOMAN"), message: "کف sanity نرخ نقره" },
    { key: "ELORIA_SILVER_RATE_MAX_TOMAN", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPositiveNumber("ELORIA_SILVER_RATE_MAX_TOMAN"), message: "سقف sanity نرخ نقره" },
    { key: "ELORIA_GOLD_RATE_MAX_DEVIATION_PERCENT", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPercent("ELORIA_GOLD_RATE_MAX_DEVIATION_PERCENT"), message: "حداکثر جهش مجاز نرخ طلا" },
    { key: "ELORIA_SILVER_RATE_MAX_DEVIATION_PERCENT", required: dynamicPricingEnabled, valid: !dynamicPricingEnabled || isPercent("ELORIA_SILVER_RATE_MAX_DEVIATION_PERCENT"), message: "حداکثر جهش مجاز نرخ نقره" },

    { key: "ZARINPAL_MERCHANT_ID", required: paymentEnabled, valid: !paymentEnabled || /^[0-9a-fA-F-]{36}$/.test(value("ZARINPAL_MERCHANT_ID")), message: "Merchant ID زرین‌پال" },
    { key: "ELORIA_PAYMENT_START_SECRET", required: paymentEnabled, valid: !paymentEnabled || present("ELORIA_PAYMENT_START_SECRET", 48), message: "کلید مستقل مجوز شروع پرداخت Guest" },
    { key: "ZARINPAL_API_BASE", required: false, valid: optionalOfficialHttpsEndpoint("ZARINPAL_API_BASE", "payment.zarinpal.com", "/pg/v4/payment"), message: "API زرین‌پال فقط روی endpoint رسمی HTTPS" },
    { key: "ZARINPAL_STARTPAY_BASE", required: false, valid: optionalOfficialHttpsEndpoint("ZARINPAL_STARTPAY_BASE", "payment.zarinpal.com", "/pg/StartPay"), message: "StartPay زرین‌پال فقط روی endpoint رسمی HTTPS" },

    { key: "SUPABASE_URL", required: true, valid: isHttpsUrl("SUPABASE_URL"), message: "آدرس Storage" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, valid: present("SUPABASE_SERVICE_ROLE_KEY", 40), message: "کلید Storage" },
    { key: "ELORIA_STORAGE_BUCKET", required: true, valid: present("ELORIA_STORAGE_BUCKET", 2), message: "نام Bucket تصاویر" },

    { key: "CRON_SECRET", required: true, valid: present("CRON_SECRET", 48), message: "کلید Cron" },
    { key: "ELORIA_HEALTH_SECRET", required: true, valid: present("ELORIA_HEALTH_SECRET", 48), message: "کلید مستقل Health" },
    { key: "ELORIA_TRACKING_SECRET", required: true, valid: present("ELORIA_TRACKING_SECRET", 32), message: "کلید لینک امن پیگیری سفارش" },
    { key: "ELORIA_PAYMENT_RECEIPT_SECRET", required: true, valid: present("ELORIA_PAYMENT_RECEIPT_SECRET", 32), message: "کلید رسید امن پرداخت" },
    { key: "ELORIA_SECRET_SEPARATION", required: true, valid: distinctSecrets(secretKeys.map(key => value(key))), message: "کلیدهای امنیتی باید مستقل باشند" },

    { key: "DATABASE_SSL_MODE", required: true, valid: value("DATABASE_SSL_MODE") === "verify-full", message: "اعتبارسنجی کامل TLS دیتابیس" },
    { key: "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", required: true, valid: isThirtyTwoByteBase64("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"), message: "کلید ثابت ۳۲ بایتی Base64 برای Server Actions" },
    { key: "ELORIA_DEPLOYMENT_ID", required: true, valid: present("ELORIA_DEPLOYMENT_ID", 6), message: "شناسه Release" },

    { key: "ELORIA_TRUST_PROXY", required: true, valid: trustProxy, message: "برای rate-limit مبتنی بر IP، Proxy قابل اعتماد باید صریح فعال باشد" },
    { key: "ELORIA_PROXY_PROVIDER", required: trustProxy, valid: !trustProxy || proxyProvider === "cloudflare" || proxyProvider === "generic", message: "Provider معتبر برای هدرهای IP" },
    { key: "ELORIA_RATE_LIMIT_FAILURE_MODE", required: true, valid: value("ELORIA_RATE_LIMIT_FAILURE_MODE").toLowerCase() === "closed", message: "Rate limit در Production باید fail-closed باشد" },

    { key: "ELORIA_SECURITY_ALERT_MOBILE", required: Boolean(securityAlertMobile), valid: !securityAlertMobile || /^09\d{9}$/.test(securityAlertMobile), message: "شماره موبایل هشدار امنیتی" },
    { key: "ELORIA_SECURITY_ALERT_WEBHOOK_URL", required: Boolean(securityAlertWebhook), valid: !securityAlertWebhook || securityAlertWebhookChannel, message: "Webhook امن هشدار امنیتی" },
    { key: "ELORIA_SECURITY_ALERT_MIN_SEVERITY", required: true, valid: ["INFO", "MEDIUM", "HIGH", "CRITICAL"].includes(securityAlertSeverity), message: "حداقل سطح هشدار خارجی" },
    { key: "ELORIA_SECURITY_ALERT_COOLDOWN_SECONDS", required: true, valid: Number.isFinite(securityAlertCooldown) && securityAlertCooldown >= 30 && securityAlertCooldown <= 3600, message: "Cooldown هشدار امنیتی بین ۳۰ تا ۳۶۰۰ ثانیه" },
    { key: "ELORIA_SECURITY_ALERT_CHANNEL", required: true, valid: securityAlertSmsChannel || securityAlertWebhookChannel, message: "حداقل یک کانال هشدار امنیتی SMS یا HTTPS webhook باید فعال باشد" },

    { key: "ELORIA_LEGAL_PAGES_INDEX", required: true, valid: isExplicitBoolean("ELORIA_LEGAL_PAGES_INDEX"), message: "Index شدن صفحات حقوقی باید صریح باشد" },
  ];
}

export function assertProductionEnvironment(): void {
  if (process.env.NODE_ENV !== "production") return;
  const failed = productionEnvironmentChecks().filter(
    check => check.required && !check.valid,
  );
  if (failed.length) {
    throw new Error(
      `متغیرهای محیطی ناقص یا نامعتبر: ${failed.map(item => item.key).join(", ")}`,
    );
  }
}
