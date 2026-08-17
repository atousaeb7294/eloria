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

import {
  getMetalRateSaleDecision,
  type MetalRateSaleMode,
  type MetalRateSaleReason,
} from "@/lib/metal-rate-sale-policy";

import {
  prisma,
  withDatabaseRetry,
} from "@/lib/prisma";

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
  readonly code:
    ProductPricingErrorCode;

  readonly status:
    number;

  constructor(
    code: ProductPricingErrorCode,
    message: string,
    status = 400,
  ) {
    super(message);

    this.name =
      "ProductPricingError";

    this.code =
      code;

    this.status =
      status;
  }
}

export type GetProductPriceInput = {
  /**
   * شناسه متنی محصول
   */
  slug:
    string;

  /**
   * شناسه تنوع محصول
   */
  variantId?:
    string | null;

  /**
   * اجازه استفاده نمایشی از نرخ غیرقابل‌فروش.
   *
   * نرخ بازار بسته که مطابق سیاست معتبر باشد،
   * حتی با false نیز قابل استفاده است.
   *
   * در ثبت سفارش و پرداخت باید false باقی بماند.
   */
  allowStaleRate?:
    boolean;
};

export type ProductPriceResult = {
  product: {
    id:
      string;

    slug:
      string;

    sku:
      string | null;

    nameFa:
      string;

    nameEn:
      string;

    material:
      MaterialType;

    purity:
      string | null;

    purityFineness:
      number | null;

    weightGrams:
      string | null;

    status:
      | "DRAFT"
      | "ACTIVE"
      | "OUT_OF_STOCK"
      | "ARCHIVED";

    stock:
      number;

    isPurchasable:
      boolean;

    primaryImage: {
      url: string;
      altFa: string | null;
      altEn: string | null;
    } | null;
  };

  variant: {
    id:
      string;

    sku:
      string | null;

    titleFa:
      string;

    titleEn:
      string;

    purity:
      string | null;

    purityFineness:
      number | null;

    weightGrams:
      string | null;

    stock:
      number;
  } | null;

  pricing: {
    mode:
      | "DYNAMIC"
      | "MANUAL";

    currency:
      "TOMAN";

    finalPriceToman:
      string;

    formulaVersion:
      | JewelryPriceResult["formulaVersion"]
      | "MANUAL_V1";

    breakdown:
      JewelryPriceResult | null;
  };

  liveRate: {
    material:
      MaterialType;

    /**
     * نرخی که واقعاً وارد موتور محاسبه شده است.
     *
     * در حالت بازار بسته، شامل حاشیه امنیت است.
     */
    pricePerGramToman:
      string;

    /**
     * نرخ خام دریافت‌شده از منبع بازار.
     */
    originalPricePerGramToman:
      string;

    /**
     * نرخ قابل‌فروش پس از اعمال سیاست.
     *
     * در صورت غیرقابل‌فروش بودن نرخ، null است.
     */
    effectivePricePerGramToman:
      string | null;

    referencePurity:
      number;

    source:
      string | null;

    sourceSymbol:
      string;

    sourceDate:
      string | null;

    sourceTime:
      string | null;

    /**
     * زمان واقعی نرخ دریافت‌شده از منبع بازار.
     */
    sourceTimeUnix:
      string | null;

    /**
     * sourceTimeUnix تبدیل‌شده به ISO.
     */
    marketTimestamp:
      string | null;

    /**
     * زمان موفقیت درخواست API.
     * این فیلد معیار تازگی نرخ بازار نیست.
     */
    lastSuccessAt:
      string;

    /**
     * سن نرخ بر اساس sourceTimeUnix.
     */
    ageSeconds:
      number | null;

    isStale:
      boolean;

    freshnessReason:
      MetalRateFreshnessReason;

    saleMode:
      MetalRateSaleMode;

    saleReason:
      MetalRateSaleReason;

    isUsableForSale:
      boolean;

    appliedSafetyMarginPercent:
      string;

    safetyMarginAmountToman:
      string;
  } | null;

  policy: {
    defaultProfitPercent:
      string;

    defaultTaxPercent:
      string;

    taxMetalValue:
      boolean;

    quoteTtlSeconds:
      number;

    staleAfterMinutes:
      number;

    closedMarketPricingEnabled:
      boolean;

    closedMarketMaxAgeMinutes:
      number;

    closedMarketSafetyMarginPercent:
      string;

    roundingStep:
      number;
  };

  quote: {
    generatedAt:
      string;

    expiresAt:
      string;
  };
};

function assertValidSlug(
  slug: string,
): string {
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

function getUnavailableRateMessage(
  saleReason:
    MetalRateSaleReason,

  freshnessReason:
    MetalRateFreshnessReason,
): string {
  if (
    freshnessReason ===
    "SOURCE_TIME_MISSING"
  ) {
    return "زمان واقعی نرخ بازار موجود نیست. پرداخت تا دریافت نرخ معتبر متوقف شده است.";
  }

  if (
    freshnessReason ===
      "SOURCE_TIME_INVALID" ||
    freshnessReason ===
      "SOURCE_TIME_IN_FUTURE"
  ) {
    return "زمان نرخ بازار معتبر نیست. پرداخت تا دریافت نرخ معتبر متوقف شده است.";
  }

  if (
    saleReason ===
    "CLOSED_MARKET_DISABLED"
  ) {
    return "نرخ فلز منقضی شده و قیمت‌گذاری بازار بسته برای این فلز غیرفعال است.";
  }

  if (
    saleReason ===
    "RATE_TOO_OLD"
  ) {
    return "آخرین نرخ معتبر از سقف زمانی مجاز بازار بسته عبور کرده است. پرداخت تا دریافت نرخ جدید متوقف شده است.";
  }

  return "نرخ فلز برای فروش معتبر نیست. پرداخت تا دریافت نرخ جدید متوقف شده است.";
}


async function loadProductRecord(normalizedSlug: string) {
  return prisma.product.findFirst({
    where: {
      slug: normalizedSlug,
      status: { in: ["ACTIVE", "OUT_OF_STOCK"] },
    },
    include: {
      variants: {
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
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
      images: {
        orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
        take: 1,
        select: { imageUrl: true, altFa: true, altEn: true },
      },
    },
  });
}

type ProductRecord = Awaited<ReturnType<typeof loadProductRecord>>;

type ProductRecordCacheEntry = {
  value: ProductRecord;
  freshUntil: number;
  staleUntil: number;
};

type ProductPricingGlobal = typeof globalThis & {
  __eloriaProductPricingCache?: Map<string, ProductRecordCacheEntry>;
  __eloriaProductPricingInflight?: Map<string, Promise<ProductRecord>>;
  __eloriaPricingReferenceCache?: Map<
    MaterialType,
    { value: PricingReferenceRecord; freshUntil: number; staleUntil: number }
  >;
  __eloriaPricingReferenceInflight?: Map<
    MaterialType,
    Promise<PricingReferenceRecord>
  >;
};

async function loadPricingReference(material: MaterialType) {
  const [policy, metalPrice] = await Promise.all([
    prisma.pricingPolicy.findFirst({
      where: { material, isActive: true },
    }),
    prisma.metalPrice.findUnique({
      where: { material },
    }),
  ]);

  return { policy, metalPrice };
}

type PricingReferenceRecord = Awaited<ReturnType<typeof loadPricingReference>>;

const productPricingGlobal = globalThis as ProductPricingGlobal;
const productCache =
  productPricingGlobal.__eloriaProductPricingCache ??
  new Map<string, ProductRecordCacheEntry>();
const productInflight =
  productPricingGlobal.__eloriaProductPricingInflight ??
  new Map<string, Promise<ProductRecord>>();
const referenceCache =
  productPricingGlobal.__eloriaPricingReferenceCache ??
  new Map<MaterialType, { value: PricingReferenceRecord; freshUntil: number; staleUntil: number }>();
const referenceInflight =
  productPricingGlobal.__eloriaPricingReferenceInflight ??
  new Map<MaterialType, Promise<PricingReferenceRecord>>();

productPricingGlobal.__eloriaProductPricingCache = productCache;
productPricingGlobal.__eloriaProductPricingInflight = productInflight;
productPricingGlobal.__eloriaPricingReferenceCache = referenceCache;
productPricingGlobal.__eloriaPricingReferenceInflight = referenceInflight;

function refreshProductRecord(normalizedSlug: string): Promise<ProductRecord> {
  const existing = productInflight.get(normalizedSlug);
  if (existing) {
    return existing;
  }

  const request = withDatabaseRetry(() => loadProductRecord(normalizedSlug))
    .then((value) => {
      const storedAt = Date.now();
      productCache.set(normalizedSlug, {
        value,
        freshUntil: storedAt + 30_000,
        staleUntil: storedAt + 5 * 60_000,
      });
      return value;
    })
    .finally(() => {
      productInflight.delete(normalizedSlug);
    });

  productInflight.set(normalizedSlug, request);
  return request;
}

async function getProductRecord(normalizedSlug: string): Promise<ProductRecord> {
  const now = Date.now();
  const cached = productCache.get(normalizedSlug);

  if (cached && cached.freshUntil > now) {
    return cached.value;
  }

  if (cached && cached.staleUntil > now) {
    void refreshProductRecord(normalizedSlug).catch((error) => {
      console.warn(
        `[Eloria Pricing] Unable to refresh product ${normalizedSlug}; serving stale display data.`,
        error,
      );
    });
    return cached.value;
  }

  return refreshProductRecord(normalizedSlug);
}

function refreshPricingReference(
  material: MaterialType,
): Promise<PricingReferenceRecord> {
  const existing = referenceInflight.get(material);
  if (existing) {
    return existing;
  }

  const request = withDatabaseRetry(() => loadPricingReference(material))
    .then((value) => {
      const storedAt = Date.now();
      referenceCache.set(material, {
        value,
        freshUntil: storedAt + 30_000,
        staleUntil: storedAt + 10 * 60_000,
      });
      return value;
    })
    .finally(() => {
      referenceInflight.delete(material);
    });

  referenceInflight.set(material, request);
  return request;
}

async function getPricingReference(material: MaterialType): Promise<PricingReferenceRecord> {
  const now = Date.now();
  const cached = referenceCache.get(material);

  if (cached && cached.freshUntil > now) {
    return cached.value;
  }

  if (cached && cached.staleUntil > now) {
    void refreshPricingReference(material).catch((error) => {
      console.warn(
        "[Eloria Pricing] Unable to refresh pricing reference; serving stale rate record.",
        error,
      );
    });
    return cached.value;
  }

  return refreshPricingReference(material);
}

export async function getProductLivePrice({
  slug,
  variantId,
  allowStaleRate = false,
}: GetProductPriceInput): Promise<ProductPriceResult> {
  const normalizedSlug =
    assertValidSlug(
      slug,
    );

  const product =
    await getProductRecord(
      normalizedSlug,
    );

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

  const {
    policy,
    metalPrice,
  } =
    await getPricingReference(
      product.material as MaterialType,
    );

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

    primaryImage:
      product.images[0]
        ? {
            url: product.images[0].imageUrl,
            altFa: product.images[0].altFa,
            altEn: product.images[0].altEn,
          }
        : null,
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

  const policyOutput = {
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

    closedMarketPricingEnabled:
      policy.closedMarketPricingEnabled,

    closedMarketMaxAgeMinutes:
      policy.closedMarketMaxAgeMinutes,

    closedMarketSafetyMarginPercent:
      policy.closedMarketSafetyMarginPercent.toString(),

    roundingStep:
      policy.roundingStep,
  };

  /*
   * قیمت‌گذاری دستی فقط برای موارد استثنایی است.
   * محصولات معمولی الوریا باید روی DYNAMIC باشند.
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

      policy:
        policyOutput,

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
    productPurityFineness <=
      0 ||
    productPurityFineness >
      1000
  ) {
    throw new ProductPricingError(
      "INVALID_PRODUCT_PURITY",
      "عیار عددی محصول ثبت نشده است.",
      422,
    );
  }



  if (!metalPrice) {
    throw new ProductPricingError(
      "METAL_PRICE_NOT_FOUND",
      "نرخ فلز این محصول موجود نیست.",
      503,
    );
  }

  /*
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

  const saleDecision =
    getMetalRateSaleDecision({
      material:
        product.material as MaterialType,

      referencePricePerGramToman:
        metalPrice.pricePerGram.toString(),

      freshness:
        rateFreshness,

      closedMarketPricingEnabled:
        policy.closedMarketPricingEnabled,

      closedMarketMaxAgeMinutes:
        policy.closedMarketMaxAgeMinutes,

      closedMarketSafetyMarginPercent:
        policy.closedMarketSafetyMarginPercent.toString(),
    });

  /*
   * نرخ تازه و نرخ معتبر بازار بسته قابل فروش هستند.
   *
   * نرخ غیرقابل‌فروش فقط برای نمایش صفحه محصول و در صورت
   * allowStaleRate=true اجازه عبور دارد.
   */
  if (
    !saleDecision.isUsableForSale &&
    !allowStaleRate
  ) {
    throw new ProductPricingError(
      "METAL_PRICE_STALE",

      getUnavailableRateMessage(
        saleDecision.reason,
        rateFreshness.reason,
      ),

      503,
    );
  }

  /*
   * نرخ قابل‌فروش بازار بسته شامل حاشیه امنیت است.
   *
   * اگر نرخ کاملاً غیرقابل‌فروش باشد ولی صرفاً برای نمایش
   * اجازه عبور داشته باشد، نرخ خام نمایش داده می‌شود.
   */
  const calculationPricePerGramToman =
    saleDecision
      .effectivePricePerGramToman ??
    metalPrice.pricePerGram.toString();

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
        calculationPricePerGramToman,

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
        calculationPricePerGramToman,

      originalPricePerGramToman:
        metalPrice.pricePerGram.toString(),

      effectivePricePerGramToman:
        saleDecision
          .effectivePricePerGramToman,

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
        metalPrice.sourceTimeUnix
          ?.toString() ??
        null,

      marketTimestamp:
        rateFreshness
          .marketTimestamp
          ?.toISOString() ??
        null,

      lastSuccessAt:
        metalPrice.lastSuccessAt
          .toISOString(),

      ageSeconds:
        rateFreshness.ageSeconds,

      isStale:
        rateFreshness.isStale,

      freshnessReason:
        rateFreshness.reason,

      saleMode:
        saleDecision.mode,

      saleReason:
        saleDecision.reason,

      isUsableForSale:
        saleDecision
          .isUsableForSale,

      appliedSafetyMarginPercent:
        saleDecision
          .appliedSafetyMarginPercent,

      safetyMarginAmountToman:
        saleDecision
          .safetyMarginAmountToman,
    },

    policy:
      policyOutput,

    quote: {
      generatedAt:
        now.toISOString(),

      expiresAt:
        expiresAt.toISOString(),
    },
  };
}