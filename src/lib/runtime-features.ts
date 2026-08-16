export type EloriaFeature =
  | "ELORIA_COMMERCE_ENABLED"
  | "ELORIA_CUSTOMER_AUTH_ENABLED"
  | "ELORIA_DYNAMIC_PRICING_ENABLED"
  | "ELORIA_PAYMENT_ENABLED"
  | "ELORIA_SUPPORT_ENABLED";

export function isFeatureEnabled(
  name: EloriaFeature,
  nonProductionDefault = true,
): boolean {
  const raw = process.env[name]?.trim().toLowerCase();

  if (raw === "true" || raw === "1") return true;
  if (raw === "false" || raw === "0") return false;

  return process.env.NODE_ENV !== "production"
    ? nonProductionDefault
    : false;
}

export function isCommerceEnabled(): boolean {
  return isFeatureEnabled("ELORIA_COMMERCE_ENABLED");
}

export function isCustomerAuthEnabled(): boolean {
  return isFeatureEnabled("ELORIA_CUSTOMER_AUTH_ENABLED");
}

export function isDynamicPricingEnabled(): boolean {
  return isFeatureEnabled("ELORIA_DYNAMIC_PRICING_ENABLED");
}

export function isPaymentEnabled(): boolean {
  return isFeatureEnabled("ELORIA_PAYMENT_ENABLED");
}

export function isSupportEnabled(): boolean {
  return isFeatureEnabled("ELORIA_SUPPORT_ENABLED");
}
