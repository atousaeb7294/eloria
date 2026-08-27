import { randomBytes, scryptSync } from "node:crypto";

const password = process.argv[2];

if (!password || password.length < 20) {
  console.error("یک رمز حداقل ۲۰ نویسه‌ای بعد از فرمان وارد کنید.");
  process.exit(1);
}

const salt = randomBytes(16);
const digest = scryptSync(password, salt, 64);
console.log(`scrypt$${salt.toString("hex")}$${digest.toString("hex")}`);
