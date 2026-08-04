import { randomBytes } from "node:crypto";

const values = {
  ELORIA_ADMIN_SESSION_SECRET: randomBytes(48).toString("hex"),
  CRON_SECRET: randomBytes(48).toString("hex"),
  ELORIA_TRACKING_SECRET: randomBytes(48).toString("hex"),
  ELORIA_PAYMENT_RECEIPT_SECRET: randomBytes(48).toString("hex"),
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: randomBytes(32).toString("base64"),
};

console.log("# این مقادیر را فقط در Secret/Environment هاست ذخیره کنید.");
console.log("# آن‌ها را داخل Git یا پیام عمومی قرار ندهید.\n");
for (const [key, value] of Object.entries(values)) {
  console.log(`${key}=${value}`);
}
