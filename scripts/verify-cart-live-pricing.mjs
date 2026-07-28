import fs from "node:fs";
import path from "node:path";

const projectRoot =
  process.cwd();

const files = {
  cartQuoteRoute:
    path.resolve(
      projectRoot,
      "src/app/api/cart/quote/route.ts",
    ),

  productPricingCore:
    path.resolve(
      projectRoot,
      "src/lib/product-pricing-core.ts",
    ),

  productPricingWrapper:
    path.resolve(
      projectRoot,
      "src/lib/product-pricing.ts",
    ),

  salePolicyTest:
    path.resolve(
      projectRoot,
      "scripts/test-metal-rate-sale-policy.ts",
    ),
};

const failures = [];

function readRequiredFile(
  label,
  filePath,
) {
  if (
    !fs.existsSync(
      filePath,
    )
  ) {
    failures.push(
      `${label} پیدا نشد: ${filePath}`,
    );

    return "";
  }

  return fs.readFileSync(
    filePath,
    "utf8",
  );
}

function requireMatch({
  source,
  pattern,
  message,
}) {
  if (
    !pattern.test(
      source,
    )
  ) {
    failures.push(
      message,
    );
  }
}

function requireAbsent({
  source,
  pattern,
  message,
}) {
  if (
    pattern.test(
      source,
    )
  ) {
    failures.push(
      message,
    );
  }
}

const cartQuoteSource =
  readRequiredFile(
    "Cart Quote route",
    files.cartQuoteRoute,
  );

const coreSource =
  readRequiredFile(
    "Product pricing core",
    files.productPricingCore,
  );

const wrapperSource =
  readRequiredFile(
    "Product pricing wrapper",
    files.productPricingWrapper,
  );

readRequiredFile(
  "Closed-market policy test",
  files.salePolicyTest,
);

/*
 * Cart Quote باید از تابع سخت‌گیرانه قیمت‌گذاری استفاده کند.
 */
requireMatch({
  source:
    cartQuoteSource,

  pattern:
    /import\s*\{[\s\S]*?\bgetProductLivePrice\b[\s\S]*?\}\s*from\s*["']@\/lib\/product-pricing["']/m,

  message:
    "Cart Quote باید getProductLivePrice را از product-pricing وارد کند.",
});

requireMatch({
  source:
    cartQuoteSource,

  pattern:
    /\bawait\s+getProductLivePrice\s*\(\s*\{/m,

  message:
    "Cart Quote باید getProductLivePrice را فراخوانی کند.",
});

requireAbsent({
  source:
    cartQuoteSource,

  pattern:
    /\bgetProductDisplayPrice\b/m,

  message:
    "Cart Quote نباید از getProductDisplayPrice استفاده کند.",
});

/*
 * Wrapper سخت‌گیرانه باید allowStaleRate را false نگه دارد.
 */
requireMatch({
  source:
    wrapperSource,

  pattern:
    /export\s+async\s+function\s+getProductLivePrice[\s\S]*?allowStaleRate\s*:\s*false/m,

  message:
    "تابع سخت‌گیرانه getProductLivePrice باید allowStaleRate را false تنظیم کند.",
});

/*
 * موتور اصلی باید تصمیم فروش مشترک را استفاده کند.
 */
requireMatch({
  source:
    coreSource,

  pattern:
    /getMetalRateSaleDecision/m,

  message:
    "موتور قیمت‌گذاری باید getMetalRateSaleDecision را استفاده کند.",
});

requireMatch({
  source:
    coreSource,

  pattern:
    /closedMarketPricingEnabled\s*:\s*policy\.closedMarketPricingEnabled/m,

  message:
    "وضعیت فعال‌بودن قیمت‌گذاری بازار بسته به تصمیم فروش ارسال نشده است.",
});

requireMatch({
  source:
    coreSource,

  pattern:
    /closedMarketMaxAgeMinutes\s*:\s*policy\.closedMarketMaxAgeMinutes/m,

  message:
    "سقف عمر نرخ بازار بسته به تصمیم فروش ارسال نشده است.",
});

requireMatch({
  source:
    coreSource,

  pattern:
    /closedMarketSafetyMarginPercent\s*:\s*policy\.closedMarketSafetyMarginPercent\.toString\(\)/m,

  message:
    "درصد حاشیه امنیت به تصمیم فروش ارسال نشده است.",
});

/*
 * خرید فقط زمانی متوقف می‌شود که نرخ واقعاً غیرقابل‌فروش باشد.
 */
requireMatch({
  source:
    coreSource,

  pattern:
    /!saleDecision\.isUsableForSale\s*&&\s*!allowStaleRate/m,

  message:
    "شرط رد نرخ غیرقابل‌فروش مطابق سیاست جدید پیدا نشد.",
});

/*
 * نرخ مؤثر شامل حاشیه امنیت باید وارد موتور محاسبه شود.
 */
requireMatch({
  source:
    coreSource,

  pattern:
    /const\s+calculationPricePerGramToman\s*=\s*saleDecision[\s\S]*?effectivePricePerGramToman[\s\S]*?\?\?\s*metalPrice\.pricePerGram\.toString\(\)/m,

  message:
    "انتخاب نرخ مؤثر یا نرخ خام برای محاسبه پیدا نشد.",
});

requireMatch({
  source:
    coreSource,

  pattern:
    /referencePricePerGramToman\s*:\s*calculationPricePerGramToman/m,

  message:
    "موتور قیمت‌گذاری هنوز نرخ مؤثر بازار بسته را دریافت نمی‌کند.",
});

/*
 * خروجی باید وضعیت و جزئیات حاشیه امنیت را افشا کند.
 */
requireMatch({
  source:
    coreSource,

  pattern:
    /saleMode\s*:\s*saleDecision\.mode/m,

  message:
    "saleMode در خروجی نرخ محصول ثبت نشده است.",
});

requireMatch({
  source:
    coreSource,

  pattern:
    /effectivePricePerGramToman\s*:\s*saleDecision[\s\S]*?\.effectivePricePerGramToman/m,

  message:
    "نرخ مؤثر در خروجی محصول ثبت نشده است.",
});

requireMatch({
  source:
    coreSource,

  pattern:
    /appliedSafetyMarginPercent\s*:\s*saleDecision[\s\S]*?\.appliedSafetyMarginPercent/m,

  message:
    "درصد حاشیه امنیت در خروجی محصول ثبت نشده است.",
});

requireMatch({
  source:
    coreSource,

  pattern:
    /safetyMarginAmountToman\s*:\s*saleDecision[\s\S]*?\.safetyMarginAmountToman/m,

  message:
    "مبلغ حاشیه امنیت در خروجی محصول ثبت نشده است.",
});

if (
  failures.length >
  0
) {
  console.error(
    "\nFAIL: Cart closed-market pricing verification failed:\n",
  );

  for (
    const failure of
    failures
  ) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "PASS: Cart Quote uses strict server pricing, accepts configured closed-market rates, applies the safety margin, and rejects unavailable rates.",
);