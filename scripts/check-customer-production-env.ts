import "dotenv/config";

const production = process.env.NODE_ENV === "production" || process.argv.includes("--production");
const errors: string[] = [];
const authSecret = process.env.ELORIA_CUSTOMER_AUTH_SECRET?.trim() ?? "";
if (production && authSecret.length < 48) errors.push("ELORIA_CUSTOMER_AUTH_SECRET must be at least 48 characters.");
if (production && (process.env.ELORIA_CUSTOMER_OTP_DEV_CODE?.trim() ?? "")) errors.push("ELORIA_CUSTOMER_OTP_DEV_CODE must not be set in production.");
const smsFlag = (process.env.ELORIA_CUSTOMER_SMS_OTP_ENABLED?.trim() ?? "true").toLowerCase();
const smsEnabled = smsFlag === "true";
if (production && smsFlag !== "true") errors.push("ELORIA_CUSTOMER_SMS_OTP_ENABLED must be true for mobile-only customer auth.");
if (production && smsEnabled && (process.env.SMS_IR_API_KEY?.trim() ?? "").length < 16) errors.push("SMS_IR_API_KEY is required when customer SMS OTP is enabled.");
if (production && smsEnabled && !/^\d+$/.test(process.env.SMS_IR_VERIFY_TEMPLATE_ID?.trim() ?? "")) errors.push("SMS_IR_VERIFY_TEMPLATE_ID must be a numeric SMS.ir Verify template ID.");
if (production && smsEnabled && !/^[A-Za-z][A-Za-z0-9_-]{0,31}$/.test(process.env.SMS_IR_VERIFY_PARAMETER?.trim() ?? "")) errors.push("SMS_IR_VERIFY_PARAMETER must match the SMS.ir Verify pattern parameter.");
if (production && !(process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? "").startsWith("https://")) errors.push("NEXT_PUBLIC_SITE_URL must be an HTTPS production URL.");
if (production && !/^\d+$/.test(process.env.ELORIA_SHIPPING_FLAT_TOMAN?.trim() ?? "")) errors.push("ELORIA_SHIPPING_FLAT_TOMAN must be explicitly set to a non-negative Toman amount (0 means free shipping).");
if (errors.length) { console.error(errors.map(x => `FAIL  ${x}`).join("\n")); process.exit(1); }
console.log("PASS  Customer production environment gate");
