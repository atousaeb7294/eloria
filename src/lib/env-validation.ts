type Check = { key: string; required: boolean; valid: boolean; message: string };

function value(key: string): string {
  return process.env[key]?.trim() ?? "";
}
function present(key: string, minimum = 1): boolean {
  return value(key).length >= minimum;
}
function isHttpsUrl(key: string): boolean {
  try {
    return new URL(value(key)).protocol === "https:";
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

export function productionEnvironmentChecks(): Check[] {
  const paymentEnabled = present("ZARINPAL_MERCHANT_ID");
  const smsEnabled = present("KAVENEGAR_API_KEY");
  const turnstileEnabled =
    present("TURNSTILE_SECRET_KEY") ||
    present("NEXT_PUBLIC_TURNSTILE_SITE_KEY");
  const totpEnabled = present("ELORIA_ADMIN_TOTP_SECRET");
  const trustProxy = ["true", "1"].includes(value("ELORIA_TRUST_PROXY"));
  const proxyProvider = value("ELORIA_PROXY_PROVIDER").toLowerCase();
  const secretKeys = [
    "ELORIA_ADMIN_SESSION_SECRET",
    "ELORIA_CUSTOMER_AUTH_SECRET",
    "ELORIA_TRACKING_SECRET",
    "ELORIA_PAYMENT_RECEIPT_SECRET",
  ];

  return [
    { key: "DATABASE_URL", required: true, valid: present("DATABASE_URL", 20), message: "اتصال PostgreSQL Pool" },
    { key: "DIRECT_URL", required: true, valid: present("DIRECT_URL", 20), message: "اتصال مستقیم Migration" },
    { key: "NEXT_PUBLIC_SITE_URL", required: true, valid: isHttpsUrl("NEXT_PUBLIC_SITE_URL"), message: "دامنه HTTPS سایت" },
    { key: "ELORIA_ADMIN_USERNAME", required: true, valid: present("ELORIA_ADMIN_USERNAME", 3), message: "نام کاربری مدیر" },
    { key: "ELORIA_ADMIN_PASSWORD", required: true, valid: present("ELORIA_ADMIN_PASSWORD", 14), message: "رمز قوی مدیر" },
    { key: "ELORIA_ADMIN_SESSION_SECRET", required: true, valid: present("ELORIA_ADMIN_SESSION_SECRET", 48), message: "کلید نشست مدیر" },
    { key: "ELORIA_CUSTOMER_AUTH_SECRET", required: true, valid: present("ELORIA_CUSTOMER_AUTH_SECRET", 48), message: "کلید نشست و OTP مشتری" },
    { key: "ELORIA_ADMIN_SESSION_VERSION", required: true, valid: present("ELORIA_ADMIN_SESSION_VERSION", 1), message: "نسخه ابطال نشست" },
    { key: "ELORIA_ADMIN_TOTP_SECRET", required: totpEnabled, valid: !totpEnabled || /^[A-Z2-7]+=*$/i.test(value("ELORIA_ADMIN_TOTP_SECRET")), message: "کلید TOTP مدیر" },
    { key: "CRON_SECRET", required: true, valid: present("CRON_SECRET", 48), message: "کلید Cron" },
    { key: "ELORIA_TRACKING_SECRET", required: true, valid: present("ELORIA_TRACKING_SECRET", 32), message: "کلید لینک امن پیگیری سفارش" },
    { key: "ELORIA_PAYMENT_RECEIPT_SECRET", required: true, valid: present("ELORIA_PAYMENT_RECEIPT_SECRET", 32), message: "کلید رسید امن پرداخت" },
    { key: "ELORIA_SECRET_SEPARATION", required: true, valid: distinctSecrets(secretKeys.map(key => value(key))), message: "کلیدهای نشست، پیگیری و رسید باید مستقل باشند" },
    { key: "DATABASE_SSL_MODE", required: true, valid: value("DATABASE_SSL_MODE") === "verify-full", message: "اعتبارسنجی کامل TLS دیتابیس" },
    { key: "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY", required: true, valid: isThirtyTwoByteBase64("NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"), message: "کلید ثابت ۳۲ بایتی Base64 برای Server Actions" },
    { key: "ELORIA_DEPLOYMENT_ID", required: true, valid: present("ELORIA_DEPLOYMENT_ID", 6), message: "شناسه Release" },
    { key: "ELORIA_TRUST_PROXY", required: true, valid: trustProxy, message: "اعتماد به Proxy میزبان" },
    { key: "ELORIA_PROXY_PROVIDER", required: trustProxy, valid: !trustProxy || proxyProvider === "cloudflare" || proxyProvider === "generic", message: "Provider معتبر برای هدرهای IP" },
    { key: "ELORIA_RATE_LIMIT_FAILURE_MODE", required: true, valid: value("ELORIA_RATE_LIMIT_FAILURE_MODE").toLowerCase() === "closed", message: "Rate limit در Production باید fail-closed باشد" },
    { key: "ELORIA_SHIPPING_FLAT_TOMAN", required: true, valid: isNonNegativeInteger("ELORIA_SHIPPING_FLAT_TOMAN"), message: "هزینه ارسال باید صریح و نامنفی باشد" },
    { key: "ELORIA_FREE_SHIPPING_FROM_TOMAN", required: true, valid: isOptionalNonNegativeInteger("ELORIA_FREE_SHIPPING_FROM_TOMAN"), message: "آستانه ارسال رایگان باید خالی یا عدد صحیح نامنفی باشد" },
    { key: "BRS_API_KEY", required: true, valid: present("BRS_API_KEY", 1), message: "کلید منبع نرخ فلز" },
    { key: "SUPABASE_URL", required: true, valid: isHttpsUrl("SUPABASE_URL"), message: "آدرس Storage" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, valid: present("SUPABASE_SERVICE_ROLE_KEY", 40), message: "کلید Storage" },
    { key: "ELORIA_STORAGE_BUCKET", required: true, valid: present("ELORIA_STORAGE_BUCKET", 2), message: "نام Bucket تصاویر" },
    { key: "ZARINPAL_MERCHANT_ID", required: paymentEnabled, valid: !paymentEnabled || /^[0-9a-fA-F-]{36}$/.test(value("ZARINPAL_MERCHANT_ID")), message: "Merchant ID زرین‌پال" },
    { key: "KAVENEGAR_API_KEY", required: smsEnabled, valid: !smsEnabled || present("KAVENEGAR_API_KEY", 16), message: "کلید پیامک" },
    { key: "NEXT_PUBLIC_TURNSTILE_SITE_KEY", required: turnstileEnabled, valid: !turnstileEnabled || present("NEXT_PUBLIC_TURNSTILE_SITE_KEY", 10), message: "کلید عمومی Turnstile" },
    { key: "TURNSTILE_SECRET_KEY", required: turnstileEnabled, valid: !turnstileEnabled || present("TURNSTILE_SECRET_KEY", 10), message: "کلید خصوصی Turnstile" },
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
