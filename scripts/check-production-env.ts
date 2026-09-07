import "dotenv/config";
import { productionEnvironmentChecks } from "../src/lib/env-validation";

const checks = productionEnvironmentChecks();
let failed = false;
for (const check of checks) {
  const status = check.valid ? "OK" : check.required ? "ERROR" : "WARN";
  console.log(`${status.padEnd(5)} ${check.key.padEnd(34)} ${check.message}`);
  if (check.required && !check.valid) failed = true;
}
if (failed) {
  console.error("\nمتغیرهای الزامی محیط تولید کامل نیستند.");
  process.exit(1);
}
console.log("\nتنظیمات الزامی محیط تولید معتبر هستند.");
