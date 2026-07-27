import {
  calculateJewelryPrice,
  type JewelryPriceResult,
  type MakingChargeType,
  type MaterialType,
} from "@/lib/pricing-engine";

import {
  getMetalRateFreshness,
  type MetalRateFreshnessReason,
} from "@/lib/metal-rate-freshness";

import { prisma } from "@/lib/prisma";

export type ProductPricingErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "VARIANT_NOT_FOUND"
  | "PRICING_POLICY_NOT_FOUND"
  | "METAL_PRICE_NOT_FOUND"
  | "METAL_PRICE_STALE"
  | "INVALID_PRODUCT_WEIGHT"
  | "INVALID_PRODUCT_PURITY"
  | "MANUAL_PRICE_NOT_FOUND"
  | "UNSUPPORTED_CURRENCY";

export class ProductPricingError extends Error {
  readonly code: ProductPricingErrorCode;
  readonly status: number;

  constructor(
    code: ProductPricingErrorCode,
    message: string,
    status = 400,
  ) {
    super(message);

    this.name = "ProductPricingError";
    this.code = code;
    this.status = status;
  }
}

export type GetProductPriceInput = {
  /**
   * شناسه متنی محصول.
   */
  slug: string;

  /**
   * شناسه تنوع محصول.
   */
  variantId?: string | null;

  /**
   * اجازه استفاده از آخرین نرخ ذخیره‌شده
   * فقط برای نمایش صفحات محصول.
   *
   * در ثبت سفارش و پرداخت باید false باقی بماند.
   */
  allowStaleRate?: boolean;
};

export type ProductPriceResult = {
  product: {
    id: string;
    slug: string;
    sku: string | null;
    nameFa: string;
    nameEn: string;
    material: MaterialType;
    purity: string | null;
    purityFineness: number | null;
    weightGrams: string | null;

    status:
      | "DRAFT"
      | "ACTIVE"
      | "OUT_OF_STOCK"
      | "ARCHIVED";

    stock: number;
    isPurchasable: boolean;
  };

  variant: {
    id: string;
    sku: string | null;
    titleFa: string;
    titleEn: string;
    purity: string | null;
    purityFineness: number | null;
    weightGrams: string | null;
    stock: number;
  } | null;

  pricing: {
    mode: "DYNAMIC" | "MANUAL";
    currency: "TOMAN";
    finalPriceToman: string;

    formulaVersion:
      | JewelryPriceResult["formulaVersion"]
      | "MANUAL_V1";

    breakdown:
      JewelryPriceResult | null;
  };

  liveRate: {
    material: MaterialType;
    pricePerGramToman: string;
    referencePurity: number;
    source: string | null;
    sourceSymbol: string;
    sourceDate: string | null;
    sourceTime: string | null;

    /**
     * زمان واقعی نرخ دریافت‌شده از منبع بازار.
     */
    sourceTimeUnix: string | null;

    /**
     * sourceTimeUnix تبدیل‌شده به ISO.
     */
    marketTimestamp: string | null;

    /**
     * زمان موفقیت درخواست API.
     * این فیلد معیار تازگی نرخ بازار نیست.
     */
    lastSuccessAt: string;

    /**
     * سن نرخ بر اساس sourceTimeUnix.
     */
    ageSeconds: number | null;

    isStale: boolean;

    freshnessReason:
      MetalRateFreshnessReason;
  } | null;

  policy: {
    defaultProfitPercent: string;
    defaultTaxPercent: string;
    taxMetalValue: boolean;
    quoteTtlSeconds: number;
    staleAfterMinutes: number;
    roundingStep: number;
  };

  quote: {
    generatedAt: string;
    expiresAt: string;
  };
};

function assertValidSlug(
  slug: string,
) {
  const normalized =
    slug.trim();

  if (!normalized) {
    throw new ProductPricingError(
      "PRODUCT_NOT_FOUND",
      "شناسه محصول معتبر نیست.",
      404,
    );
  }

  return normalized;
}

function getStaleRateMessage(
  reason: MetalRateFreshnessReason,
): string {
  if (
    reason ===
    "SOURCE_TIME_MISSING"
  ) {
    return "زمان واقعی نرخ بازار موجود نیست. پرداخت تا دریافت نرخ معتبر متوقف شده است.";
  }

  if (
    reason ===
      "SOURCE_TIME_INVALID" ||
    reason ===
      "SOURCE_TIME_IN_FUTURE"
  ) {
    return "زمان نرخ بازار معتبر نیست. پرداخت تا دریافت نرخ معتبر متوقف شده است.";
  }

  return "نرخ فلز منقضی شده است. پرداخت تا دریافت نرخ جدید متوقف شده است.";
}

export async function getProductLivePrice({
  slug,
  variantId,
  allowStaleRate = false,
}: GetProductPriceInput): Promise<ProductPriceResult> {
  const normalizedSlug =
    assertValidSlug(slug);

  const product =
    await prisma.product.findFirst({
      where: {
        slug:
          normalizedSlug,

        status: {
          in: [
            "ACTIVE",
            "OUT_OF_STOCK",
          ],
        },
      },

      include: {
        variants: {
          where: {
            isActive:
              true,
          },

          orderBy: {
            displayOrder:
              "asc",
          },

          select: {
            id: true,
            sku: true,
            titleFa: true,
            titleEn: true,
            price: true,
            stock: true,
            metalWeight: true,
            purity: true,
            purityFineness: true,
            makingChargeFixed: true,
            makingChargePerGram: true,
            makingChargePercent: true,
            artisticFee: true,
          },
        },
      },
    });

  if (!product) {
    throw new ProductPricingError(
      "PRODUCT_NOT_FOUND",
      "محصول موردنظر پیدا نشد.",
      404,
    );
  }

  const variant =
    variantId
      ? product.variants.find(
          (item) =>
            item.id ===
            variantId,
        )
      : null;

  if (
    variantId &&
    !variant
  ) {
    throw new ProductPricingError(
      "VARIANT_NOT_FOUND",
      "نسخه انتخاب‌شده محصول پیدا نشد.",
      404,
    );
  }

  const policy =
    await prisma.pricingPolicy.findFirst({
      where: {
        material:
          product.material,

        isActive:
          true,
      },
    });

  if (!policy) {
    throw new ProductPricingError(
      "PRICING_POLICY_NOT_FOUND",
      "سیاست قیمت‌گذاری این محصول تنظیم نشده است.",
      503,
    );
  }

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        policy.quoteTtlSeconds *
          1000,
    );

  const productWeight =
    variant?.metalWeight ??
    product.metalWeight;

  const productPurityFineness =
    variant?.purityFineness ??
    product.purityFineness;

  const productPurityLabel =
    variant?.purity ??
    product.purity;

  const stock =
    variant?.stock ??
    product.stock;

  const isPurchasable =
    product.status ===
      "ACTIVE" &&
    stock > 0;

  const productOutput = {
    id:
      product.id,

    slug:
      product.slug,

    sku:
      product.sku,

    nameFa:
      product.nameFa,

    nameEn:
      product.nameEn,

    material:
      product.material as MaterialType,

    purity:
      productPurityLabel,

    purityFineness:
      productPurityFineness,

    weightGrams:
      productWeight?.toString() ??
      null,

    status:
      product.status,

    stock,

    isPurchasable,
  };

  const variantOutput =
    variant
      ? {
          id:
            variant.id,

          sku:
            variant.sku,

          titleFa:
            variant.titleFa,

          titleEn:
            variant.titleEn,

          purity:
            variant.purity ??
            product.purity,

          purityFineness:
            variant.purityFineness ??
            product.purityFineness,

          weightGrams:
            (
              variant.metalWeight ??
              product.metalWeight
            )?.toString() ??
            null,

          stock:
            variant.stock,
        }
      : null;

  /*
   * قیمت‌گذاری دستی فقط برای موارد استثنایی است.
   * محصولات عادی الوریا باید روی DYNAMIC باشند.
   */
  if (
    product.pricingMode ===
    "MANUAL"
  ) {
    const manualPrice =
      variant?.price ??
      product.price;

    if (!manualPrice) {
      throw new ProductPricingError(
        "MANUAL_PRICE_NOT_FOUND",
        "قیمت دستی این محصول ثبت نشده است.",
        503,
      );
    }

    return {
      product:
        productOutput,

      variant:
        variantOutput,

      pricing: {
        mode:
          "MANUAL",

        currency:
          "TOMAN",

        finalPriceToman:
          manualPrice.toString(),

        formulaVersion:
          "MANUAL_V1",

        breakdown:
          null,
      },

      liveRate:
        null,

      policy: {
        defaultProfitPercent:
          policy.defaultProfitPercent.toString(),

        defaultTaxPercent:
          policy.defaultTaxPercent.toString(),

        taxMetalValue:
          policy.taxMetalValue,

        quoteTtlSeconds:
          policy.quoteTtlSeconds,

        staleAfterMinutes:
          policy.staleAfterMinutes,

        roundingStep:
          policy.roundingStep,
      },

      quote: {
        generatedAt:
          now.toISOString(),

        expiresAt:
          expiresAt.toISOString(),
      },
    };
  }

  if (
    product.currency !==
    "TOMAN"
  ) {
    throw new ProductPricingError(
      "UNSUPPORTED_CURRENCY",
      "موتور قیمت‌گذاری فعلی فقط تومان را پشتیبانی می‌کند.",
      503,
    );
  }

  if (!productWeight) {
    throw new ProductPricingError(
      "INVALID_PRODUCT_WEIGHT",
      "وزن محصول ثبت نشده است.",
      422,
    );
  }

  if (
    !productPurityFineness ||
    productPurityFineness <= 0 ||
    productPurityFineness > 1000
  ) {
    throw new ProductPricingError(
      "INVALID_PRODUCT_PURITY",
      "عیار عددی محصول ثبت نشده است.",
      422,
    );
  }

  const metalPrice =
    await prisma.metalPrice.findUnique({
      where: {
        material:
          product.material,
      },
    });

  if (!metalPrice) {
    throw new ProductPricingError(
      "METAL_PRICE_NOT_FOUND",
      "نرخ زنده فلز این محصول موجود نیست.",
      503,
    );
  }

  /**
   * معیار اصلی تازگی نرخ، زمان واقعی بازار است.
   * lastSuccessAt فقط زمان موفقیت درخواست API است.
   */
  const rateFreshness =
    getMetalRateFreshness({
      sourceTimeUnix:
        metalPrice.sourceTimeUnix,

      staleAfterMinutes:
        policy.staleAfterMinutes,

      now,
    });

  const isMetalPriceStale =
    rateFreshness.isStale;

  /**
   * نرخ قدیمی فقط برای نمایش صفحه قابل استفاده است.
   *
   * پرداخت، ثبت سفارش و APIهای حساس
   * نرخ منقضی یا فاقد زمان معتبر را رد می‌کنند.
   */
  if (
    isMetalPriceStale &&
    !allowStaleRate
  ) {
    throw new ProductPricingError(
      "METAL_PRICE_STALE",

      getStaleRateMessage(
        rateFreshness.reason,
      ),

      503,
    );
  }

  const makingChargeFixed =
    variant?.makingChargeFixed ??
    product.makingChargeFixed;

  const makingChargePerGram =
    variant?.makingChargePerGram ??
    product.makingChargePerGram;

  const makingChargePercent =
    variant?.makingChargePercent ??
    product.makingChargePercent;

  const artisticFee =
    variant?.artisticFee ??
    product.artisticFee;

  const profitPercent =
    product.profitPercent ??
    policy.defaultProfitPercent;

  const taxPercent =
    product.taxPercent ??
    policy.defaultTaxPercent;

  const calculation =
    calculateJewelryPrice({
      material:
        product.material as MaterialType,

      weightGrams:
        productWeight.toString(),

      productPurity:
        productPurityFineness,

      referencePricePerGramToman:
        metalPrice.pricePerGram.toString(),

      referencePurity:
        metalPrice.referencePurity,

      makingChargeType:
        product.makingChargeType as MakingChargeType,

      makingChargeFixedToman:
        makingChargeFixed.toString(),

      makingChargePerGramToman:
        makingChargePerGram.toString(),

      makingChargePercent:
        makingChargePercent.toString(),

      artisticFeeToman:
        artisticFee.toString(),

      profitPercent:
        profitPercent.toString(),

      taxPercent:
        taxPercent.toString(),

      taxMetalValue:
        policy.taxMetalValue,

      roundingStepToman:
        policy.roundingStep.toString(),
    });

  return {
    product:
      productOutput,

    variant:
      variantOutput,

    pricing: {
      mode:
        "DYNAMIC",

      currency:
        "TOMAN",

      finalPriceToman:
        calculation.finalPriceToman,

      formulaVersion:
        calculation.formulaVersion,

      breakdown:
        calculation,
    },

    liveRate: {
      material:
        product.material as MaterialType,

      pricePerGramToman:
        metalPrice.pricePerGram.toString(),

      referencePurity:
        metalPrice.referencePurity,

      source:
        metalPrice.source,

      sourceSymbol:
        metalPrice.sourceSymbol,

      sourceDate:
        metalPrice.sourceDate,

      sourceTime:
        metalPrice.sourceTime,

      sourceTimeUnix:
        metalPrice.sourceTimeUnix?.toString() ??
        null,

      marketTimestamp:
        rateFreshness.marketTimestamp?.toISOString() ??
        null,

      lastSuccessAt:
        metalPrice.lastSuccessAt.toISOString(),

      ageSeconds:
        rateFreshness.ageSeconds,

      isStale:
        rateFreshness.isStale,

      freshnessReason:
        rateFreshness.reason,
    },

    policy: {
      defaultProfitPercent:
        policy.defaultProfitPercent.toString(),

      defaultTaxPercent:
        policy.defaultTaxPercent.toString(),

      taxMetalValue:
        policy.taxMetalValue,

      quoteTtlSeconds:
        policy.quoteTtlSeconds,

      staleAfterMinutes:
        policy.staleAfterMinutes,

      roundingStep:
        policy.roundingStep,
    },

    quote: {
      generatedAt:
        now.toISOString(),

      expiresAt:
        expiresAt.toISOString(),
    },
  };
}