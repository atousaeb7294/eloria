import * as nextenv from "@next/env";
nextenv.loadEnvConfig(process.cwd());
import { productionEnvironmentChecks } from "../src/lib/env-validation";

const checks = productionEnvironmentChecks();
let failed = false;
for (const check of checks) {
  const status = check.valid ? "OK" : check.required ? "ERROR" : "WARN";
  console.log(`${status.padEnd(5)} ${check.key.padEnd(34)} ${check.message}`);
  if (check.required && !check.valid) failed = true;
}
if (failed) {
  console.error("\nÙ…ØªØºÛŒØ±Ù‡Ø§ÛŒ Ø§Ù„Ø²Ø§Ù…ÛŒ Ù…Ø­ÛŒØ· ØªÙˆÙ„ÛŒØ¯ Ú©Ø§Ù…Ù„ Ù†ÛŒØ³ØªÙ†Ø¯.");
  process.exit(1);
}
console.log("\nØªÙ†Ø¸ÛŒÙ…Ø§Øª Ø§Ù„Ø²Ø§Ù…ÛŒ Ù…Ø­ÛŒØ· ØªÙˆÙ„ÛŒØ¯ Ù…Ø¹ØªØ¨Ø± Ù‡Ø³ØªÙ†Ø¯.");




