import "dotenv/config";

const production = process.env.NODE_ENV === "production" || process.argv.includes("--production");
const errors: string[] = [];
const authSecret = process.env.ELORIA_CUSTOMER_AUTH_SECRET?.trim() ?? "";
if (production && authSecret.length < 48) errors.push("ELORIA_CUSTOMER_AUTH_SECRET must be at least 48 characters.");
if (production && (process.env.ELORIA_CUSTOMER_OTP_DEV_CODE?.trim() ?? "")) errors.push("ELORIA_CUSTOMER_OTP_DEV_CODE must not be set in production.");
const emailFlag = (process.env.ELORIA_CUSTOMER_EMAIL_OTP_ENABLED?.trim() ?? "true").toLowerCase();
const smsFlag = (process.env.ELORIA_CUSTOMER_SMS_OTP_ENABLED?.trim() ?? "false").toLowerCase();
const emailEnabled = emailFlag === "true";
const smsEnabled = smsFlag === "true";
if (production && !["true", "false"].includes(emailFlag)) errors.push("ELORIA_CUSTOMER_EMAIL_OTP_ENABLED must be true or false.");
if (production && !["true", "false"].includes(smsFlag)) errors.push("ELORIA_CUSTOMER_SMS_OTP_ENABLED must be true or false.");
if (production && !emailEnabled && !smsEnabled) errors.push("At least one customer OTP channel must be enabled.");
if (production && emailEnabled && (process.env.RESEND_API_KEY?.trim() ?? "").length < 16) errors.push("RESEND_API_KEY is required when customer email OTP is enabled.");
if (production && emailEnabled && (process.env.ELORIA_EMAIL_FROM?.trim() ?? "").length < 5) errors.push("ELORIA_EMAIL_FROM is required when customer email OTP is enabled.");
if (production && smsEnabled && (process.env.KAVENEGAR_API_KEY?.trim() ?? "").length < 16) errors.push("KAVENEGAR_API_KEY is required when customer SMS OTP is enabled.");
if (production && !(process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "").startsWith("https://")) errors.push("NEXT_PUBLIC_SITE_URL must be an HTTPS production URL.");
if (production && !/^\d+$/.test(process.env.ELORIA_SHIPPING_FLAT_TOMAN?.trim() ?? "")) errors.push("ELORIA_SHIPPING_FLAT_TOMAN must be explicitly set to a non-negative Toman amount (0 means free shipping).");
if (errors.length) { console.error(errors.map(x => `FAIL  ${x}`).join("\n")); process.exit(1); }
console.log("PASS  Customer production environment gate");
