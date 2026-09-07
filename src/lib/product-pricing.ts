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

/**
 * قیمت‌گذاری سخت‌گیرانه برای عملیات حساس.
 *
 * در این حالت نرخ منقضی پذیرفته نمی‌شود.
 * این تابع هیچ درخواست خارجی برای دریافت نرخ بازار ارسال نمی‌کند
 * و فقط از نرخ ذخیره‌شده در دیتابیس استفاده می‌کند.
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
 * قیمت مخصوص نمایش محصول.
 *
 * برای اینکه صفحه محصول در صورت قدیمی‌شدن نرخ از دسترس خارج نشود،
 * آخرین نرخ ذخیره‌شده می‌تواند برای نمایش استفاده شود.
 *
 * این تابع نیز هیچ درخواست خارجی برای دریافت نرخ بازار ارسال نمی‌کند.
 * به‌روزرسانی نرخ‌ها فقط توسط مسیر Cron انجام می‌شود.
 */
export async function getProductDisplayPrice(
  input: GetProductPriceInput,
): Promise<ProductPriceResult> {
  return getProductLivePriceCore({
    ...input,

    allowStaleRate:
      true,
  });
}