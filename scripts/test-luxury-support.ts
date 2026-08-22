import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

const productPage = read("src/app/[locale]/products/[slug]/page.tsx");
assert.ok(productPage.includes("getProductDisplayPrice"));
assert.ok(productPage.includes("originalPricePerGramToman"));
assert.ok(productPage.includes("formattedWeight"));
assert.ok(productPage.includes("فرمول مالی ثبت‌شده"));
assert.ok(!productPage.includes("formattedMakingCharge"));
assert.ok(!productPage.includes("formattedProfit"));
assert.ok(!productPage.includes("formattedArtisticFee"));

const chatRoute = read("src/app/api/support/chat/route.ts");
assert.ok(chatRoute.includes("hasTrustedOrigin"));
assert.ok(chatRoute.includes("consumeRateLimit"));
assert.ok(chatRoute.includes("verifyTurnstileToken"));
assert.ok(chatRoute.includes("support-chat"));
assert.ok(chatRoute.includes("setSupportChatCookie"));

const adminRoute = read("src/app/api/admin/support/route.ts");
assert.ok(adminRoute.includes("hasValidAdminSession"));
assert.ok(adminRoute.includes("touchSupportAgentPresence"));
assert.ok(adminRoute.includes("replyToSupportConversation"));

const supportData = read("src/lib/support-chat.ts");
assert.ok(supportData.includes("accessTokenHash"));
assert.ok(supportData.includes("PRESENCE_WINDOW_MS"));
assert.ok(supportData.includes("randomBytes"));
assert.ok(!supportData.includes("dangerouslySetInnerHTML"));

const widget = read("src/components/customer-support-widget.tsx");
assert.ok(widget.includes("/api/support/chat"));
assert.ok(widget.includes("eloria-open-support"));
assert.ok(widget.includes("mailto:"));

const selection = read("src/components/smart-selection-assistant.tsx");
assert.ok(selection.includes("eloria-open-selection"));
assert.ok(selection.includes("availability: \"available\""));
assert.ok(selection.includes("maxPrice"));

const globalStyles = read("src/app/globals.css");
assert.ok(globalStyles.includes('@import "@fontsource-variable/vazirmatn"'));
assert.ok(!globalStyles.includes("estedad"));

console.log("PASS  luxury selection, support chat, and private price display contracts");
