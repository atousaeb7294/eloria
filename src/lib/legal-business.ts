export type LegalBusinessIdentity = {
  sellerName: string;
  businessAddress: string;
  supportPhone: string;
  supportEmail: string;
  instagramUrl: string;
  telegramUrl: string;
  baleUrl: string;
  complete: boolean;
};

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function validPhone(value: string): boolean {
  return /^\+?[0-9][0-9\s()\-]{4,30}$/.test(value);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function socialUrl(value: string, hosts: string[]): string {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    return url.protocol === "https:" && hosts.includes(hostname) ? url.toString() : "";
  } catch {
    return "";
  }
}

export function legalBusinessIdentity(): LegalBusinessIdentity {
  const configuredSellerName = env("ELORIA_LEGAL_SELLER_NAME");
  const businessAddress = env("ELORIA_LEGAL_BUSINESS_ADDRESS");
  const rawPhone = env("ELORIA_LEGAL_SUPPORT_PHONE");
  const rawEmail = env("ELORIA_LEGAL_SUPPORT_EMAIL");
  const instagramUrl = socialUrl(env("ELORIA_SOCIAL_INSTAGRAM_URL"), ["instagram.com"]);
  const telegramUrl = socialUrl(env("ELORIA_SOCIAL_TELEGRAM_URL"), ["t.me", "telegram.me"]);
  const baleUrl = socialUrl(env("ELORIA_SOCIAL_BALE_URL"), ["ble.ir", "bale.ai"]);

  const supportPhone = validPhone(rawPhone) ? rawPhone : "";
  const supportEmail = validEmail(rawEmail) ? rawEmail : "";

  return {
    sellerName: configuredSellerName || "ELORIA",
    businessAddress,
    supportPhone,
    supportEmail,
    instagramUrl,
    telegramUrl,
    baleUrl,
    complete: Boolean(
      configuredSellerName.length >= 2 &&
        businessAddress.length >= 10 &&
        (supportPhone || supportEmail),
    ),
  };
}

export function hasCompleteLegalIdentity(): boolean {
  return legalBusinessIdentity().complete;
}
