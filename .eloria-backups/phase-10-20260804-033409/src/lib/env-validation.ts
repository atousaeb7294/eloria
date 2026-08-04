type Check = { key: string; required: boolean; valid: boolean; message: string };
function present(key: string, minimum = 1) { return (process.env[key]?.trim().length ?? 0) >= minimum; }
export function productionEnvironmentChecks(): Check[] {
  const paymentEnabled = present("ZARINPAL_MERCHANT_ID");
  const smsEnabled = present("KAVENEGAR_API_KEY");
  return [
    { key: "DATABASE_URL", required: true, valid: present("DATABASE_URL", 20), message: "اتصال PostgreSQL" },
    { key: "DIRECT_URL", required: false, valid: !process.env.DIRECT_URL || present("DIRECT_URL", 20), message: "اتصال مستقیم Migration" },
    { key: "NEXT_PUBLIC_SITE_URL", required: true, valid: /^https:\/\//.test(process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? ""), message: "دامنه HTTPS سایت" },
    { key: "ELORIA_ADMIN_PASSWORD", required: true, valid: present("ELORIA_ADMIN_PASSWORD", 12), message: "رمز قوی مدیر" },
    { key: "ELORIA_ADMIN_SESSION_SECRET", required: true, valid: present("ELORIA_ADMIN_SESSION_SECRET", 32), message: "کلید نشست مدیر" },
    { key: "CRON_SECRET", required: true, valid: present("CRON_SECRET", 32), message: "کلید Cron" },
    { key: "SUPABASE_URL", required: true, valid: /^https:\/\//.test(process.env.SUPABASE_URL?.trim() ?? ""), message: "آدرس Storage" },
    { key: "SUPABASE_SERVICE_ROLE_KEY", required: true, valid: present("SUPABASE_SERVICE_ROLE_KEY", 40), message: "کلید Storage" },
    { key: "ELORIA_STORAGE_BUCKET", required: true, valid: present("ELORIA_STORAGE_BUCKET", 2), message: "نام Bucket تصاویر" },
    { key: "ZARINPAL_MERCHANT_ID", required: paymentEnabled, valid: !paymentEnabled || /^[0-9a-fA-F-]{36}$/.test(process.env.ZARINPAL_MERCHANT_ID?.trim() ?? ""), message: "Merchant ID زرین‌پال" },
    { key: "KAVENEGAR_API_KEY", required: smsEnabled, valid: !smsEnabled || present("KAVENEGAR_API_KEY", 16), message: "کلید پیامک" },
  ];
}
export function assertProductionEnvironment() {
  const failed = productionEnvironmentChecks().filter(check => check.required && !check.valid);
  if (failed.length) throw new Error(`متغیرهای محیطی ناقص: ${failed.map(item => item.key).join(", ")}`);
}
