import {
  after,
} from "next/server";

import {
  syncMetalPrices,
} from "@/lib/metal-price-sync";

import {
  ProductPricingError,
  getProductLivePrice as getProductLivePriceCore,
  type GetProductPriceInput,
  type ProductPriceResult,
  type ProductPricingErrorCode,
} from "@/lib/product-pricing-core";

export {
  ProductPricingError,
};

export type {
  GetProductPriceInput,
  ProductPriceResult,
  ProductPricingErrorCode,
};

declare global {
  var __eloriaMetalPriceRefreshPromise:
    | Promise<void>
    | undefined;
}

function sleep(
  milliseconds: number,
): Promise<void> {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds,
      );
    },
  );
}

function isTemporaryDatabaseError(
  error: unknown,
): boolean {
  const message =
    error instanceof Error
      ? error.message.toLowerCase()
      : String(error).toLowerCase();

  return (
    message.includes(
      "connection terminated unexpectedly",
    ) ||
    message.includes(
      "query read timeout",
    ) ||
    message.includes(
      "eauthtimeout",
    ) ||
    message.includes(
      "timeout while waiting",
    ) ||
    message.includes(
      "connection closed",
    ) ||
    message.includes(
      "connection reset",
    )
  );
}

async function refreshMetalPricesWithRetry(): Promise<void> {
  const runningRefresh =
    globalThis
      .__eloriaMetalPriceRefreshPromise;

  if (runningRefresh) {
    await runningRefresh;

    return;
  }

  const refreshPromise =
    (
      async () => {
        const maximumAttempts =
          3;

        let lastError:
          unknown = null;

        for (
          let attempt = 1;
          attempt <=
          maximumAttempts;
          attempt += 1
        ) {
          try {
            await syncMetalPrices();

            console.info(
              "[Eloria Pricing] Metal prices refreshed successfully.",
            );

            return;
          } catch (error) {
            lastError =
              error;

            const retryAllowed =
              isTemporaryDatabaseError(
                error,
              );

            console.error(
              `[Eloria Pricing] Refresh attempt ${attempt} failed.`,
              error,
            );

            if (
              !retryAllowed ||
              attempt ===
                maximumAttempts
            ) {
              throw error;
            }

            await sleep(
              attempt * 1_500,
            );
          }
        }

        throw lastError;
      }
    )().finally(() => {
      globalThis
        .__eloriaMetalPriceRefreshPromise =
        undefined;
    });

  globalThis
    .__eloriaMetalPriceRefreshPromise =
    refreshPromise;

  await refreshPromise;
}

function scheduleMetalPriceRefresh() {
  const refreshTask =
    async () => {
      try {
        await refreshMetalPricesWithRetry();
      } catch (error) {
        /**
         * شکست نوسازی نرخ نباید صفحه محصول
         * یا فهرست محصولات را از دسترس خارج کند.
         */
        console.error(
          "[Eloria Pricing] Background metal price refresh failed.",
          error,
        );
      }
    };

  try {
    after(
      refreshTask,
    );
  } catch {
    /**
     * این حالت برای اجرای کد خارج از Request
     * مانند بعضی اسکریپت‌های محلی است.
     */
    void refreshTask();
  }
}

function isResultRateStale(
  result: ProductPriceResult,
): boolean {
  if (
    !result.liveRate
  ) {
    return false;
  }

  const maximumAgeSeconds =
    result.policy
      .staleAfterMinutes *
    60;

  return (
    result.liveRate
      .ageSeconds >
    maximumAgeSeconds
  );
}

/**
 * تابع سخت‌گیرانه قیمت‌گذاری.
 *
 * برای موارد حساس مانند:
 * - ثبت سفارش
 * - پرداخت
 * - صدور پیش‌فاکتور
 * - API قیمت معتبر
 *
 * نرخ منقضی‌شده را قبول نمی‌کند.
 */
export async function getProductLivePrice(
  input: GetProductPriceInput,
): Promise<ProductPriceResult> {
  return getProductLivePriceCore({
    ...input,

    allowStaleRate:
      false,
  });
}

/**
 * تابع مخصوص نمایش محصول.
 *
 * صفحه با آخرین نرخ ذخیره‌شده باز می‌شود.
 * در صورت منقضی‌بودن نرخ، نوسازی بعد از
 * ارسال پاسخ و بدون مسدودکردن صفحه انجام می‌شود.
 */
export async function getProductDisplayPrice(
  input: GetProductPriceInput,
): Promise<ProductPriceResult> {
  try {
    const result =
      await getProductLivePriceCore({
        ...input,

        allowStaleRate:
          true,
      });

    if (
      isResultRateStale(
        result,
      )
    ) {
      scheduleMetalPriceRefresh();
    }

    return result;
  } catch (error) {
    const rateDoesNotExist =
      error instanceof
        ProductPricingError &&
      error.code ===
        "METAL_PRICE_NOT_FOUND";

    if (
      !rateDoesNotExist
    ) {
      throw error;
    }

    /**
     * اگر هیچ نرخی در دیتابیس وجود نداشته باشد،
     * یک نوسازی مستقیم ضروری است؛ چون نرخ قبلی
     * برای نمایش در اختیار نداریم.
     */
    await refreshMetalPricesWithRetry();

    return getProductLivePriceCore({
      ...input,

      allowStaleRate:
        true,
    });
  }
}
