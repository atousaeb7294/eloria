export type LegalBusinessIdentity = {
  sellerName: string;
  businessAddress: string;
  supportPhone: string;
  supportEmail: string;
  complete: boolean;
};

const DEFAULT_PUBLIC_SUPPORT_PHONE = "09180079556";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function validPhone(value: string): boolean {
  return /^\+?[0-9][0-9\s()\-]{4,30}$/.test(value);
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function publicSupportPhone(): string {
  const configured = env("ELORIA_LEGAL_SUPPORT_PHONE") || env("NEXT_PUBLIC_ELORIA_SUPPORT_PHONE");
  return validPhone(configured) ? configured : DEFAULT_PUBLIC_SUPPORT_PHONE;
}

export function legalBusinessIdentity(): LegalBusinessIdentity {
  const configuredSellerName = env("ELORIA_LEGAL_SELLER_NAME");
  const businessAddress = env("ELORIA_LEGAL_BUSINESS_ADDRESS");
  const supportPhone = publicSupportPhone();
  const rawEmail = env("ELORIA_LEGAL_SUPPORT_EMAIL");
  const supportEmail = validEmail(rawEmail) ? rawEmail : "";

  return {
    sellerName: configuredSellerName || "ELORIA",
    businessAddress,
    supportPhone,
    supportEmail,
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
