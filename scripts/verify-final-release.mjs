import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";

const root = new URL("../", import.meta.url);
const read = path => readFileSync(new URL(path, root), "utf8");
const exists = path => {
  try { statSync(new URL(path, root)); return true; } catch { return false; }
};
const checks = [];
const check = (name, valid, detail = "") => {
  checks.push({ name, valid: Boolean(valid), detail });
};

const packageJson = JSON.parse(read("package.json"));
const packageLock = JSON.parse(read("package-lock.json"));
const actions = read("src/app/[locale]/admin/(protected)/products/actions.ts");
const productForm = read("src/components/admin/admin-product-form.tsx");
const introConfig = read("src/components/intro/eloria-intro-config.ts");
const introController = read("src/components/intro/use-eloria-intro-controller.ts");
const introView = read("src/components/intro/eloria-intro-view.tsx");
const cart = read("src/components/cart-page-client.tsx");
const policies = read("src/app/[locale]/policies/[policy]/page.tsx");
const paymentStart = read("src/app/api/payments/zarinpal/start/route.ts");
const paymentCallback = read("src/app/api/payments/zarinpal/callback/route.ts");
const checkoutRoute = read("src/app/api/checkout/orders/route.ts");
const nextConfig = read("next.config.ts");
const mediaStorage = read("src/lib/product-media-storage.ts");
const legalBusiness = read("src/lib/legal-business.ts");

check("package.json معتبر", packageJson?.scripts);
check("package-lock معتبر", packageLock?.packages);
check("وابستگی OpenAI حذف شده", !packageJson.dependencies?.openai && !packageLock.packages?.["node_modules/openai"]);
check("endpoint تولید روایت حذف شده", !exists("src/app/api/admin/products/generate-legend/route.ts"));
check("مولد روایت حذف شده", !exists("src/lib/product-myth-generator.ts") && !exists("src/lib/ai/myth-generator.ts"));
check("Server Action با directive درست آغاز می‌شود", actions.startsWith('"use server";'));
check("فایل اکشن BOM ندارد", readFileSync(new URL("src/app/[locale]/admin/(protected)/products/actions.ts", root))[0] !== 0xef);
check("اعداد فارسی سالم‌اند", actions.includes("۰۱۲۳۴۵۶۷۸۹") && actions.includes("٠١٢٣٤٥٦٧٨٩"));
check("عنوان روایت دستی ذخیره می‌شود", actions.includes("mythNameFa") && actions.includes("mythNameEn"));
check("فرم روایت دستی است", productForm.includes('name="mythNameFa"') && productForm.includes('name="legendFa"'));
check("Intro از فایل بهینه استفاده می‌کند", introConfig.includes("eloria-opening-v5-optimized.mp4"));
check("حجم Intro بهینه کمتر از ۳MB است", statSync(new URL("public/videos/eloria-opening-v5-optimized.mp4", root)).size < 3_000_000);
check("Intro در هر ورود قابل پخش است", !introController.includes("localStorage") && !introController.includes("sessionStorage"));
check("Intro watchdog دارد", introController.includes("FIRST_VIDEO_TIMEOUT_MS") && introController.includes("SECOND_VIDEO_TIMEOUT_MS"));
check("خطاهای رسانه پوشش داده شده‌اند", introView.includes("onStalled") && introView.includes("onAbort") && introView.includes("onError"));
check("سبد قابلیت پاک‌کردن کامل دارد", cart.includes("clearCart") && cart.includes("clearAllItems"));
check("پاک‌کردن سبد تأیید می‌خواهد", cart.includes("window.confirm(text.clearConfirm)"));
check("قوانین عیب و مغایرت را حفظ می‌کند", policies.includes("عیب، آسیب یا مغایرت") && policies.includes("حقوق آمره"));
check("عدم مرجوعی طلا مشروط و قانونمند است", policies.includes("نوسانات بازار مالی") && policies.includes("قفل‌شدن نرخ"));
check("هویت واقعی و شبکه‌های اجتماعی معتبرند", legalBusiness.includes("complete: Boolean") && legalBusiness.includes("instagramUrl") && legalBusiness.includes("baleUrl"));
check("ثبت سفارش امن و تخفیف خرید اول سروری است", checkoutRoute.includes("hasTrustedOrigin(request)") && checkoutRoute.includes("body.termsAccepted !== true") && read("src/lib/checkout-order.ts").includes("WELCOME_DISCOUNT_TOMAN"));
check("شروع پرداخت rate limit و authorization دارد", paymentStart.includes("consumeRateLimit") && paymentStart.includes("authorized"));
check("callback پرداخت با درگاه verify می‌شود", paymentCallback.includes("verifyOrderPayment"));
check("امنیت، cache و Storage داخلی فعال‌اند", nextConfig.includes("Content-Security-Policy") && nextConfig.includes("Strict-Transport-Security") && nextConfig.includes("max-age=31536000, immutable") && mediaStorage.includes("signedS3Request"));

const sourceRoots = ["src", "prisma", "scripts", "tests", "messages"];
const textExtensions = new Set([".css", ".js", ".json", ".md", ".mjs", ".prisma", ".sql", ".ts", ".tsx"]);
const walk = directory => readdirSync(new URL(`${directory}/`, root), { withFileTypes: true }).flatMap(entry => {
  const relativePath = `${directory}/${entry.name}`;
  if (entry.isDirectory()) return walk(relativePath);
  return [relativePath];
});
const releaseTextFiles = sourceRoots.flatMap(directory => exists(directory) ? walk(directory) : [])
  .filter(path => textExtensions.has(path.slice(path.lastIndexOf("."))))
  .filter(path => path !== "scripts/verify-final-release.mjs");
const malformedTextFiles = releaseTextFiles.filter(path => {
  const content = read(path);
  return content.includes("<<<<<<< ") || content.includes("=======\n") || content.includes(">>>>>>> ") || content.includes("\uFFFD");
});
check("فایل‌های متنی بدون conflict marker و نویسه جایگزین‌اند", malformedTextFiles.length === 0, malformedTextFiles.join(", "));

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: root, stdio: "pipe" });
  execFileSync("git", ["diff", "HEAD", "--check"], { cwd: root, stdio: "pipe" });
  check("git diff سالم", true);
} catch (error) {
  if (exists(".git")) checks.push({ name: "git diff سالم", valid: false, detail: String(error) });
}

const failed = checks.filter(item => !item.valid);
for (const [index, item] of checks.entries()) {
  console.log(`${String(index + 1).padStart(2, "0")}. ${item.valid ? "PASS" : "FAIL"} — ${item.name}${item.detail ? `: ${item.detail}` : ""}`);
}
console.log(`\n${checks.length} کنترل اجرا شد؛ ${failed.length} خطا.`);
if (failed.length) process.exitCode = 1;
