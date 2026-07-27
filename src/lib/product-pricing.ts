import {
  syncMetalPrices,
} from "@/lib/metal-price-sync";

import {
  ProductPricingError,
  getProductLivePrice as getProductLivePriceCore,
  type ProductPriceResult,
  type ProductPricingErrorCode,
} from "@/lib/product-pricing-core";

export {
  ProductPricingError,
};

export type {
  ProductPriceResult,
  ProductPricingErrorCode,
};

type GetProductPriceInput = {
  slug: string;
  variantId?: string | null;
};

/**
 * این Promise به‌صورت سراسری نگهداری می‌شود تا در زمان
 * منقضی‌شدن نرخ، چند درخواست هم‌زمان باعث اجرای چندباره
 * API دریافت نرخ فلز نشوند.
 */
declare global {
  var __eloriaMetalPriceSyncPromise:
    | Promise<void>
    | undefined;
}

/**
 * بررسی می‌کند که خطای فعلی مربوط به نبودن
 * یا منقضی‌شدن نرخ فلز است.
 */
function shouldRefreshMetalPrices(
  error: unknown,
): error is ProductPricingError {
  return (
    error instanceof
      ProductPricingError &&
    (
      error.code ===
        "METAL_PRICE_STALE" ||
      error.code ===
        "METAL_PRICE_NOT_FOUND"
    )
  );
}

/**
 * نرخ طلا و نقره را فقط یک بار همگام‌سازی می‌کند.
 *
 * زمانی که چند درخواست هم‌زمان وارد شوند،
 * همه درخواست‌ها منتظر یک Promise مشترک می‌مانند.
 */
async function refreshMetalPrices(): Promise<void> {
  const runningSync =
    globalThis
      .__eloriaMetalPriceSyncPromise;

  if (runningSync) {
    await runningSync;

    return;
  }

  const newSync =
    syncMetalPrices()
      .then(() => undefined)
      .finally(() => {
        globalThis
          .__eloriaMetalPriceSyncPromise =
          undefined;
      });

  globalThis
    .__eloriaMetalPriceSyncPromise =
    newSync;

  await newSync;
}

/**
 * دریافت قیمت زنده محصول همراه با نوسازی خودکار نرخ فلز.
 *
 * روند اجرا:
 *
 * 1. قیمت محصول با نرخ فعلی دیتابیس محاسبه می‌شود.
 * 2. در صورت معتبر بودن نرخ، نتیجه فوراً برگردانده می‌شود.
 * 3. در صورت منقضی یا خالی بودن نرخ، نرخ‌های جدید دریافت می‌شوند.
 * 4. نرخ طلا و نقره در دیتابیس ذخیره می‌شوند.
 * 5. محاسبه محصول فقط یک بار دیگر تکرار می‌شود.
 *
 * خطاهای دیگر، مانند نامعتبر بودن محصول، وزن یا عیار،
 * بدون تغییر به بخش فراخواننده ارسال می‌شوند.
 */
export async function getProductLivePrice(
  input: GetProductPriceInput,
): Promise<ProductPriceResult> {
  try {
    return await getProductLivePriceCore(
      input,
    );
  } catch (error) {
    if (
      !shouldRefreshMetalPrices(
        error,
      )
    ) {
      throw error;
    }

    console.info(
      "[Eloria Pricing] Metal rate is stale or missing. Refreshing automatically.",
    );

    await refreshMetalPrices();

    return getProductLivePriceCore(
      input,
    );
  }
}