import {
  type CatalogProduct,
  type ProductCatalogFilters,
  getProductsCatalog,
} from "@/lib/catalog";

import {
  getProductLivePrice,
} from "@/lib/product-pricing";

export type PricedCatalogFilters =
  ProductCatalogFilters & {
    minPriceToman?: string;
    maxPriceToman?: string;
  };

export type PricedProductsCatalogResult = {
  products: CatalogProduct[];

  total: number;

  priceFilterActive: boolean;

  pricingUnavailableCount: number;
};

/**
 * تبدیل اعداد فارسی و عربی به انگلیسی
 * و حذف تمام نویسه‌های غیرعددی.
 */
function normalizeDigits(
  value: string,
): string {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  const arabicDigits =
    "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          persianDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        String(
          arabicDigits.indexOf(
            digit,
          ),
        ),
    )
    .replace(/[^\d]/g, "");
}

/**
 * تبدیل ورودی بازه قیمت به bigint.
 * در صورت خالی یا نامعتبر بودن، null برمی‌گرداند.
 */
function parsePriceBoundary(
  value?: string,
): bigint | null {
  if (!value) {
    return null;
  }

  const normalized =
    normalizeDigits(value);

  if (!normalized) {
    return null;
  }

  try {
    return BigInt(normalized);
  } catch {
    return null;
  }
}

/**
 * اجرای چند Promise با محدودیت هم‌زمانی.
 *
 * این محدودیت برای جلوگیری از پرشدن Connection Pool
 * پایگاه داده و درخواست‌های هم‌زمان بیش‌ازحد است.
 */
async function mapWithConcurrency<
  T,
  R,
>(
  items: T[],
  concurrency: number,
  mapper: (
    item: T,
    index: number,
  ) => Promise<R>,
): Promise<R[]> {
  if (items.length === 0) {
    return [];
  }

  const output =
    new Array<R>(
      items.length,
    );

  let nextIndex = 0;

  async function worker() {
    while (true) {
      const currentIndex =
        nextIndex;

      nextIndex += 1;

      if (
        currentIndex >=
        items.length
      ) {
        return;
      }

      output[currentIndex] =
        await mapper(
          items[currentIndex],
          currentIndex,
        );
    }
  }

  const workerCount =
    Math.min(
      Math.max(
        concurrency,
        1,
      ),
      items.length,
    );

  await Promise.all(
    Array.from(
      {
        length:
          workerCount,
      },
      () => worker(),
    ),
  );

  return output;
}

/**
 * دریافت محصولات و اعمال بازه قیمت نهایی.
 *
 * نکته مهم:
 * تابع getProductLivePrice جنس محصول را از دیتابیس می‌خواند.
 *
 * بنابراین:
 * - محصول GOLD با نرخ و PricingPolicy طلا محاسبه می‌شود.
 * - محصول SILVER با نرخ و PricingPolicy نقره محاسبه می‌شود.
 */
export async function getPricedProductsCatalog(
  filters: PricedCatalogFilters,
): Promise<PricedProductsCatalogResult> {
  const baseCatalog =
    await getProductsCatalog({
      search:
        filters.search,

      collectionSlug:
        filters.collectionSlug,

      material:
        filters.material,

      availability:
        filters.availability,
    });

  let minPrice =
    parsePriceBoundary(
      filters.minPriceToman,
    );

  let maxPrice =
    parsePriceBoundary(
      filters.maxPriceToman,
    );

  /**
   * اگر کاربر حداقل را بزرگ‌تر از حداکثر وارد کند،
   * دو مقدار به‌صورت خودکار جابه‌جا می‌شوند.
   */
  if (
    minPrice !== null &&
    maxPrice !== null &&
    minPrice > maxPrice
  ) {
    const temporary =
      minPrice;

    minPrice =
      maxPrice;

    maxPrice =
      temporary;
  }

  const priceFilterActive =
    minPrice !== null ||
    maxPrice !== null;

  /**
   * وقتی بازه قیمت فعال نیست، برای افزایش سرعت
   * قیمت زنده همه محصولات محاسبه نمی‌شود.
   */
  if (!priceFilterActive) {
    return {
      products:
        baseCatalog.products,

      total:
        baseCatalog.total,

      priceFilterActive:
        false,

      pricingUnavailableCount:
        0,
    };
  }

  /**
   * محاسبه قیمت نهایی هر محصول.
   *
   * هم‌زمانی روی ۲ قرار گرفته تا فشار زیادی
   * به Supabase و Connection Pool وارد نشود.
   */
  const pricedProducts =
    await mapWithConcurrency(
      baseCatalog.products,
      2,
      async (product) => {
        try {
          const result =
            await getProductLivePrice({
              slug:
                product.slug,
            });

          return {
            product,

            finalPriceToman:
              BigInt(
                result.pricing
                  .finalPriceToman,
              ),
          };
        } catch (error) {
          console.error(
            `Unable to calculate live price for product "${product.slug}".`,
            error,
          );

          return {
            product,

            finalPriceToman:
              null,
          };
        }
      },
    );

  let pricingUnavailableCount =
    0;

  const filteredProducts =
    pricedProducts
      .filter((item) => {
        if (
          item.finalPriceToman ===
          null
        ) {
          pricingUnavailableCount +=
            1;

          return false;
        }

        if (
          minPrice !== null &&
          item.finalPriceToman <
            minPrice
        ) {
          return false;
        }

        if (
          maxPrice !== null &&
          item.finalPriceToman >
            maxPrice
        ) {
          return false;
        }

        return true;
      })
      .map(
        (item) =>
          item.product,
      );

  return {
    products:
      filteredProducts,

    total:
      filteredProducts.length,

    priceFilterActive:
      true,

    pricingUnavailableCount,
  };
}