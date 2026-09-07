import type { CustomerOtpChannel } from "@/lib/customer-auth";

export type CustomerAuthChannelAvailability = {
  emailEnabled: boolean;
  smsEnabled: boolean;
  preferredChannel: CustomerOtpChannel | null;
};

type Environment = Record<string, string | undefined>;

function enabledFlag(
  environment: Environment,
  key: string,
  defaultValue: boolean,
): boolean {
  const raw = environment[key]?.trim().toLowerCase();

  if (!raw) {
    return defaultValue;
  }

  return raw === "true" || raw === "1";
}

export function getCustomerAuthChannelAvailability(
  environment: Environment = process.env,
): CustomerAuthChannelAvailability {
  const smsEnabled =
    enabledFlag(environment, "ELORIA_CUSTOMER_SMS_OTP_ENABLED", true) &&
    (environment.SMS_IR_API_KEY?.trim().length ?? 0) >= 16 &&
    /^\d+$/.test(environment.SMS_IR_VERIFY_TEMPLATE_ID?.trim() ?? "");

  return {
    // Customer identity is intentionally mobile-only. The field remains in
    // this public shape so older server components can deserialize safely.
    emailEnabled: false,
    smsEnabled,
    preferredChannel: smsEnabled ? "SMS" : null,
  };
}

export function isCustomerOtpChannelEnabled(
  channel: CustomerOtpChannel,
  environment: Environment = process.env,
): boolean {
  const availability = getCustomerAuthChannelAvailability(environment);
  return channel === "SMS" && availability.smsEnabled;
}
