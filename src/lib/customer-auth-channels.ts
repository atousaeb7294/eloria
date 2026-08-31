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
  const emailEnabled =
    enabledFlag(environment, "ELORIA_CUSTOMER_EMAIL_OTP_ENABLED", true) &&
    (environment.RESEND_API_KEY?.trim().length ?? 0) >= 16 &&
    (environment.ELORIA_EMAIL_FROM?.trim().length ?? 0) >= 5;

  const smsEnabled =
    enabledFlag(environment, "ELORIA_CUSTOMER_SMS_OTP_ENABLED", false) &&
    (environment.KAVENEGAR_API_KEY?.trim().length ?? 0) >= 16;

  return {
    emailEnabled,
    smsEnabled,
    preferredChannel: emailEnabled ? "EMAIL" : smsEnabled ? "SMS" : null,
  };
}

export function isCustomerOtpChannelEnabled(
  channel: CustomerOtpChannel,
  environment: Environment = process.env,
): boolean {
  const availability = getCustomerAuthChannelAvailability(environment);
  return channel === "EMAIL"
    ? availability.emailEnabled
    : availability.smsEnabled;
}
