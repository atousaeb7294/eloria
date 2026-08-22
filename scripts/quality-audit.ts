import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const root = process.cwd();
const checks: Check[] = [];
const warnings: string[] = [];

function read(relativePath: string): string {
  return readFileSync(path.join(root, relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );
}

function check(name: string, passed: boolean, detail?: string) {
  checks.push({ name, passed, detail });
}

function filesUnder(relativeRoot: string): string[] {
  const absoluteRoot = path.join(root, relativeRoot);
  const output: string[] = [];

  function walk(current: string) {
    for (const entry of readdirSync(current)) {
      const absolute = path.join(current, entry);
      const stat = statSync(absolute);

      if (stat.isDirectory()) {
        if (
          entry === "node_modules" ||
          entry === ".next" ||
          entry === "generated"
        ) {
          continue;
        }
        walk(absolute);
        continue;
      }

      if (/\.(?:ts|tsx|js|jsx|mjs|mts)$/.test(entry)) {
        output.push(path.relative(root, absolute).replaceAll("\\", "/"));
      }
    }
  }

  if (statSync(absoluteRoot).isDirectory()) {
    walk(absoluteRoot);
  }

  return output;
}

const seo = read("src/lib/seo.ts");
check(
  "Localized SEO includes x-default",
  seo.includes('"x-default": `/fa${normalizedPath}`'),
);
check(
  "SEO description normalizer exists",
  seo.includes("truncateMetaDescription"),
);

const productsPage = read("src/app/[locale]/products/page.tsx");
check(
  "Filtered catalog pages are noindex",
  productsPage.includes("ELORIA_FILTERED_CATALOG_SEO_V1") &&
    productsPage.includes("index: false") &&
    productsPage.includes("canonical: `/${locale}/products`"),
);

const productPage = read("src/app/[locale]/products/[slug]/page.tsx");
check(
  "Product metadata truncates descriptions",
  productPage.includes("truncateMetaDescription"),
);
check(
  "Missing product metadata is noindex",
  productPage.includes("fallbackProductMetadata(locale, true)"),
);
check(
  "Product OG alt uses localized image alt",
  productPage.includes("image.altFa") && productPage.includes("image.altEn"),
);

check(
  "Product pricing UI hides customer tax percentage",
  !productPage.includes("Tax percentage") &&
    !productPage.includes(
      "\u062f\u0631\u0635\u062f \u0645\u0627\u0644\u06cc\u0627\u062a",
    ) &&
    !productPage.includes("formattedTax") &&
    !productPage.includes("const taxPercent ="),
);

check(
  "Product pricing UI displays raw market rate",
  productPage.includes("originalPricePerGramToman") &&
    productPage.includes("Live raw gold rate") &&
    productPage.includes("Live raw silver rate") &&
    !productPage.includes("            .pricePerGramToman,"),
);

check(
  "Product pricing UI exposes customer price components",
  productPage.includes("makingChargeTotalToman") &&
    productPage.includes("profitToman") &&
    productPage.includes("artisticFeeToman") &&
    productPage.includes("formattedMakingCharge") &&
    productPage.includes("formattedProfit") &&
    productPage.includes("formattedArtisticFee"),
);

const internalShell = read("src/components/internal-page-shell.tsx");
const internalMainMatch = internalShell.match(/<main\b[^>]*>/i);
const internalMainTag = internalMainMatch?.[0] ?? "";
check(
  "Internal pages have a dedicated main landmark",
  internalMainTag.includes('id="main-content"') &&
    internalMainTag.includes("tabIndex={-1}") &&
    (internalMainMatch?.index ?? Number.POSITIVE_INFINITY) <
      internalShell.indexOf("<SiteFooter locale={locale} />"),
);

const homePage = read("src/app/[locale]/page.tsx");
const homeMainMatch = homePage.match(/<main\b[^>]*>/i);
const homeMainTag = homeMainMatch?.[0] ?? "";
check(
  "Home has a focusable dedicated main landmark",
  homeMainTag.includes('id="main-content"') &&
    homeMainTag.includes("tabIndex={-1}") &&
    (homeMainMatch?.index ?? Number.POSITIVE_INFINITY) <
      homePage.indexOf("<SiteFooter"),
);

const catalogCard = read("src/components/catalog-product-card.tsx");
check(
  "Catalog images use Next image optimization",
  !catalogCard.includes("unoptimized="),
);

const catalog = read("src/lib/catalog.ts");
check(
  "Catalog count and page query run concurrently",
  (catalog.match(/Promise\.all\(\[/g) ?? []).length >= 2,
);
check(
  "Broad price filters reject before product fetch",
  catalog.indexOf("if (total > MAX_PRICE_FILTER_CANDIDATES)") <
    catalog.indexOf(
      "const products = await withDatabaseRetry",
      catalog.indexOf("getCatalogPricingCandidates"),
    ),
);

const pricedCatalog = read("src/lib/priced-catalog.ts");
check(
  "Catalog pricing dependencies run concurrently",
  pricedCatalog.includes(
    "const [catalog, policies, metalPrices] = await Promise.all",
  ),
);

const pricingCore = read("src/lib/product-pricing-core.ts");
check(
  "Pricing reference queries run concurrently",
  pricingCore.includes("const [policy, metalPrice] = await Promise.all"),
);

const customerData = read("src/lib/customer-data.ts");
check(
  "Customer domain errors have a public-safe type",
  customerData.includes("export class CustomerDataError extends Error"),
);

for (const route of [
  "src/app/api/customer/me/route.ts",
  "src/app/api/customer/addresses/route.ts",
  "src/app/api/customer/addresses/[id]/route.ts",
]) {
  const content = read(route);
  check(
    `${route} sanitizes internal errors`,
    content.includes("CustomerDataError") &&
      !content.includes("error instanceof Error"),
  );
}

const introConfigPath = "src/components/intro/eloria-intro-config.ts";
const textFiles = [...filesUnder("src"), ...filesUnder("tests")];
const introKeyLeaks: string[] = [];

for (const file of textFiles) {
  if (file === introConfigPath) continue;
  const content = read(file);
  if (/eloria_intro_seen_v\d+/.test(content)) {
    introKeyLeaks.push(file);
  }
}

const localeLayout = read("src/app/[locale]/layout.tsx");
check(
  "Locale layout declares language and direction",
  localeLayout.includes("lang={locale}") &&
    localeLayout.includes('locale === "fa"') &&
    localeLayout.includes("dir="),
);

const robots = read("src/app/robots.ts");
check(
  "Robots excludes private and API routes",
  robots.includes('"/api/"') &&
    robots.includes('"/fa/admin/"') &&
    robots.includes('"/fa/checkout"') &&
    robots.includes('"/fa/profile"'),
);

const sitemap = read("src/app/sitemap.ts");
check(
  "Sitemap covers localized dynamic catalog",
  sitemap.includes("languageAlternates") &&
    sitemap.includes("prisma.product.findMany") &&
    sitemap.includes("prisma.collection.findMany"),
);
check(
  "Sitemap covers reviewed localized journal articles",
  sitemap.includes('"/journal"') &&
    sitemap.includes("prisma.contentArticle.findMany") &&
    sitemap.includes('status: "PUBLISHED"'),
);

const journalPage = read("src/app/[locale]/journal/page.tsx");
const journalArticlePage = read("src/app/[locale]/journal/[slug]/page.tsx");
const articleMarkdown = read("src/components/article-markdown.tsx");
const articleStructuredData = read(
  "src/components/article-structured-data.tsx",
);
const siteStructuredData = read("src/components/site-structured-data.tsx");
check(
  "Public journal only uses published article reads",
  journalPage.includes("getPublishedArticles") &&
    journalArticlePage.includes("getPublishedArticleBySlug"),
);
check(
  "Article body renderer does not execute raw HTML",
  !articleMarkdown.includes("dangerouslySetInnerHTML") &&
    articleMarkdown.includes("parseBlocks"),
);
check(
  "Article and site JSON-LD escape HTML delimiters",
  articleStructuredData.includes("replace(/</g") &&
    siteStructuredData.includes("replace(/</g"),
);

const contentActions = read(
  "src/app/[locale]/admin/(protected)/content/actions.ts",
);
const contentCron = read("src/app/api/cron/content-health/route.ts");
const contentHealth = read("src/lib/content-seo-health.ts");
const contentAutopilot = read("src/lib/content-autopilot.ts");
const contentDraftCron = read("src/app/api/cron/content-drafts/route.ts");
const dailyBriefingCron = read("src/app/api/cron/daily-briefing/route.ts");
const cronRunner = read("scripts/run-cron-once.mjs");
check(
  "Content publication requires a valid admin session and explicit confirmation",
  contentActions.includes("hasValidAdminSession") &&
    contentActions.includes("confirmPublish") &&
    contentActions.includes("ARTICLE_PUBLISHED"),
);
check(
  "Content health cron is authenticated and lease-protected",
  contentCron.includes("timingSafeEqual") &&
    contentCron.includes("content-health") &&
    contentCron.includes("recordContentSeoSnapshot"),
);
check(
  "SEO health uses real catalog and article signals",
  contentHealth.includes("productsMissingDescription") &&
    contentHealth.includes("productsMissingImageAlt") &&
    contentHealth.includes("stalePublishedArticleCount"),
);
check(
  "Autopilot only creates factual reviewable product drafts",
  contentAutopilot.includes("createProductAssistedArticleDraft") &&
    contentAutopilot.includes("AUTO_PRODUCT_DRAFT_CREATED") &&
    !contentAutopilot.includes('"PUBLISHED"'),
);
check(
  "Autopilot cron endpoints are authenticated and lease-protected",
  contentDraftCron.includes("timingSafeEqual") &&
    contentDraftCron.includes("content-drafts") &&
    dailyBriefingCron.includes("timingSafeEqual") &&
    dailyBriefingCron.includes("daily-briefing"),
);
check(
  "Local automation runner loads the environment and exposes only reviewed jobs",
  cronRunner.includes('import "dotenv/config"') &&
    cronRunner.includes('"content-drafts"') &&
    cronRunner.includes('"daily-briefing"'),
);

const nextConfig = read("next.config.ts");
check(
  "Security response headers remain configured",
  nextConfig.includes("Content-Security-Policy") &&
    nextConfig.includes("Strict-Transport-Security") &&
    nextConfig.includes('value: "nosniff"') &&
    nextConfig.includes('value: "DENY"'),
);

const tracked = execFileSync("git", ["ls-files"], {
  cwd: root,
  encoding: "utf8",
})
  .split(/\r?\n/)
  .filter(Boolean);

const trackedSecrets = tracked.filter((file) => {
  const name = path.basename(file);
  return (
    /^\.env(?:\.|$)/.test(name) &&
    !/\.example$|\.sample$|\.template$/.test(name)
  );
});

check(
  "No real .env files are tracked",
  trackedSecrets.length === 0,
  trackedSecrets.join(", "),
);

const sourceFiles = filesUnder("src");
const dangerousRuntime: string[] = [];
const rawImages: string[] = [];
const unsafeBlankTargets: string[] = [];

const reviewedAdminRawImageFiles = new Set([
  "src/app/[locale]/admin/(protected)/products/page.tsx",
  "src/components/admin/admin-product-media-manager.tsx",
]);

for (const file of sourceFiles) {
  const content = read(file);

  if (
    /(^|[^\w])eval\s*\(/m.test(content) ||
    /\bnew\s+Function\s*\(/.test(content)
  ) {
    dangerousRuntime.push(file);
  }

  if (/<img\b/i.test(content)) {
    rawImages.push(file);
  }

  const blankTags =
    content.match(/<(?:a|Link)\b[^>]*target\s*=\s*["']_blank["'][^>]*>/gi) ??
    [];

  for (const tag of blankTags) {
    if (
      !/rel\s*=\s*["'][^"']*\bnoopener\b[^"']*["']/i.test(tag) ||
      !/rel\s*=\s*["'][^"']*\bnoreferrer\b[^"']*["']/i.test(tag)
    ) {
      unsafeBlankTargets.push(file);
      break;
    }
  }
}

check(
  "No eval/new Function in application source",
  dangerousRuntime.length === 0,
  dangerousRuntime.join(", "),
);

const unexpectedRawImages = rawImages.filter(
  (file) => !reviewedAdminRawImageFiles.has(file),
);

const unannotatedReviewedRawImages = rawImages.filter(
  (file) =>
    reviewedAdminRawImageFiles.has(file) &&
    !read(file).includes("@next/next/no-img-element"),
);

check(
  "Raw image usage is limited to reviewed admin preview surfaces",
  unexpectedRawImages.length === 0 && unannotatedReviewedRawImages.length === 0,
  [...unexpectedRawImages, ...unannotatedReviewedRawImages].join(", "),
);

check(
  "Blank-target links declare noopener and noreferrer",
  unsafeBlankTargets.length === 0,
  unsafeBlankTargets.join(", "),
);

const playwrightConfig = read("playwright.config.ts");

check(
  "Playwright covers desktop and mobile Chromium/WebKit",
  playwrightConfig.includes('"chromium-desktop"') &&
    playwrightConfig.includes('"webkit-desktop"') &&
    playwrightConfig.includes('"chromium-mobile"') &&
    playwrightConfig.includes('"webkit-mobile"') &&
    playwrightConfig.includes('"Pixel 5"') &&
    playwrightConfig.includes('"iPhone 13"'),
);

check(
  "Local E2E uses system Chromium while CI retains WebKit matrix",
  playwrightConfig.includes("ELORIA_E2E_CHANNEL") &&
    playwrightConfig.includes("localChromiumChannel") &&
    playwrightConfig.includes("runFullBrowserMatrix") &&
    playwrightConfig.includes("process.env.CI") &&
    playwrightConfig.includes('"webkit-desktop"') &&
    playwrightConfig.includes('"webkit-mobile"'),
);

const criticalE2e = read("tests/eloria-critical-flows.spec.ts");

check(
  "Critical E2E covers OTP checkout payment and admin",
  criticalE2e.includes("/api/customer/auth/request-otp") &&
    criticalE2e.includes("/api/customer/auth/verify-otp") &&
    criticalE2e.includes("/api/checkout/orders") &&
    criticalE2e.includes("/api/payments/zarinpal/start") &&
    criticalE2e.includes("/api/payments/zarinpal/callback") &&
    criticalE2e.includes("/fa/admin") &&
    criticalE2e.includes("reusedOtp") &&
    criticalE2e.includes("secondPayload.reused"),
);

check(
  "Critical E2E stays isolated from application Prisma runtime",
  !criticalE2e.includes("../src/lib/prisma") &&
    !criticalE2e.includes("@/lib/prisma"),
);

const e2eRunner = read("scripts/run-e2e.mjs");

const e2eCleanup = read("scripts/cleanup-e2e-data.ts");

check(
  "Critical E2E always performs isolated database cleanup",
  e2eRunner.includes("E2E pre-cleanup") &&
    e2eRunner.includes("E2E post-cleanup") &&
    e2eRunner.includes("cleanup-e2e-data.ts") &&
    e2eCleanup.includes("startsWith:") &&
    e2eCleanup.includes('"e2e:"'),
);

const paymentSimulation = read("scripts/test-zarinpal-simulation.ts");

check(
  "Zarinpal simulation covers success review retry cancellation and replay",
  paymentSimulation.includes("testSuccess100AndReplay") &&
    paymentSimulation.includes("testSuccess101") &&
    paymentSimulation.includes("testCancelledCallback") &&
    paymentSimulation.includes("testMissingReferenceRequiresReview") &&
    paymentSimulation.includes("testTimeoutRemainsRetryable") &&
    paymentSimulation.includes("testProviderVerifyFailureRemainsRetryable") &&
    paymentSimulation.includes("testStaleCallbackCannotDowngradePaidOrder"),
);

const packageJson = JSON.parse(read("package.json")) as {
  scripts?: Record<string, string>;
};
check(
  "Payment provider simulation is part of verification scripts",
  packageJson.scripts?.["test:payments"] ===
    "tsx scripts/test-zarinpal-simulation.ts" &&
    packageJson.scripts?.["verify:ci"]?.includes("npm run test:payments") ===
      true,
);

check(
  "Quality audit is part of package scripts",
  packageJson.scripts?.["audit:quality"] === "tsx scripts/quality-audit.ts",
);

check(
  "Autopilot contract test is available",
  packageJson.scripts?.["test:autopilot"] ===
    "node --import tsx scripts/test-autopilot.ts",
);

const ci = read(".github/workflows/ci.yml");
check(
  "CI runs Zarinpal payment simulation",
  ci.includes("Test Zarinpal payment simulation") &&
    ci.includes("npm run test:payments"),
);

check(
  "CI runs professional quality audit",
  ci.includes("Professional quality audit") &&
    ci.includes("npm run audit:quality"),
);

check(
  "CI runs autopilot contract checks",
  ci.includes("Test autopilot contracts") &&
    ci.includes("npm run test:autopilot"),
);

for (const item of checks) {
  console.log(
    `${item.passed ? "PASS" : "FAIL"}  ${item.name}` +
      (item.detail ? ` :: ${item.detail}` : ""),
  );
}

for (const warning of warnings) {
  console.warn(`WARN  ${warning}`);
}

const failed = checks.filter((item) => !item.passed);
if (failed.length) {
  console.error(`\n${failed.length} professional quality gate(s) failed.`);
  process.exitCode = 1;
} else {
  console.log("\nAll ELORIA pre-host professional quality gates passed.");
}
