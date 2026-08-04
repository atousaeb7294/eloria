import type {
  MetalRateFreshness,
  MetalRateFreshnessReason,
} from "@/lib/metal-rate-freshness";

export type MetalRateSaleMode =
  | "LIVE"
  | "CLOSED_MARKET"
  | "UNAVAILABLE";

export type MetalRateSaleReason =
  | "LIVE_RATE"
  | "CLOSED_MARKET_RATE"
  | "CLOSED_MARKET_DISABLED"
  | "RATE_TOO_OLD"
  | "SOURCE_TIME_INVALID";

type DecimalInput =
  | string
  | number
  | bigint;

export type GetMetalRateSaleDecisionInput = {
  referencePricePerGramToman:
    DecimalInput;

  freshness:
    Pick<
      MetalRateFreshness,
      | "ageSeconds"
      | "isStale"
      | "reason"
    >;

  closedMarketPricingEnabled:
    boolean;

  /**
   * این فیلد برای سازگاری با ساختار فعلی دیتابیس
   * و سایر بخش‌های پروژه نگه داشته شده است،
   * اما دیگر باعث توقف فروش نمی‌شود.
   */
  closedMarketMaxAgeMinutes:
    number;

  closedMarketSafetyMarginPercent:
    DecimalInput;
};

export type MetalRateSaleDecision = {
  mode:
    MetalRateSaleMode;

  reason:
    MetalRateSaleReason;

  freshnessReason:
    MetalRateFreshnessReason;

  isUsableForSale:
    boolean;

  ageSeconds:
    number | null;

  originalPricePerGramToman:
    string;

  effectivePricePerGramToman:
    string | null;

  appliedSafetyMarginPercent:
    string;

  safetyMarginAmountToman:
    string;
};

const PERCENT_SCALE =
  3;

const PERCENT_FACTOR =
  BigInt(1000);

const PERCENT_DENOMINATOR =
  BigInt(100) *
  PERCENT_FACTOR;

function normalizeDecimalInput(
  value: DecimalInput,
  label: string,
): string {
  if (
    typeof value ===
    "bigint"
  ) {
    return value.toString();
  }

  if (
    typeof value ===
    "number"
  ) {
    if (
      !Number.isFinite(
        value,
      )
    ) {
      throw new Error(
        `${label} باید عدد معتبر باشد.`,
      );
    }

    return value.toString();
  }

  const normalized =
    value.trim();

  if (
    !normalized
  ) {
    throw new Error(
      `${label} نمی‌تواند خالی باشد.`,
    );
  }

  return normalized;
}

function parsePositiveInteger(
  value: DecimalInput,
  label: string,
): bigint {
  const normalized =
    normalizeDecimalInput(
      value,
      label,
    );

  if (
    !/^\d+$/.test(
      normalized,
    )
  ) {
    throw new Error(
      `${label} باید عدد صحیح مثبت باشد.`,
    );
  }

  const parsed =
    BigInt(
      normalized,
    );

  if (
    parsed <=
    BigInt(0)
  ) {
    throw new Error(
      `${label} باید بیشتر از صفر باشد.`,
    );
  }

  return parsed;
}

function parseSafetyMarginPercent(
  value: DecimalInput,
): bigint {
  const normalized =
    normalizeDecimalInput(
      value,
      "درصد حاشیه امنیت",
    );

  if (
    !/^\d+(?:\.\d+)?$/.test(
      normalized,
    )
  ) {
    throw new Error(
      "درصد حاشیه امنیت معتبر نیست.",
    );
  }

  const [
    wholePart,
    fractionPart = "",
  ] =
    normalized.split(
      ".",
    );

  const extraFraction =
    fractionPart.slice(
      PERCENT_SCALE,
    );

  if (
    extraFraction.length >
      0 &&
    /[1-9]/.test(
      extraFraction,
    )
  ) {
    throw new Error(
      "درصد حاشیه امنیت حداکثر سه رقم اعشار می‌پذیرد.",
    );
  }

  const normalizedFraction =
    fractionPart
      .slice(
        0,
        PERCENT_SCALE,
      )
      .padEnd(
        PERCENT_SCALE,
        "0",
      );

  const parsed =
    BigInt(
      wholePart,
    ) *
      PERCENT_FACTOR +
    BigInt(
      normalizedFraction,
    );

  const maximumPercent =
    BigInt(100) *
    PERCENT_FACTOR;

  if (
    parsed >
    maximumPercent
  ) {
    throw new Error(
      "درصد حاشیه امنیت نمی‌تواند بیشتر از ۱۰۰ درصد باشد.",
    );
  }

  return parsed;
}

function formatScaledPercent(
  value: bigint,
): string {
  const whole =
    value /
    PERCENT_FACTOR;

  const fraction =
    (
      value %
      PERCENT_FACTOR
    )
      .toString()
      .padStart(
        PERCENT_SCALE,
        "0",
      )
      .replace(
        /0+$/,
        "",
      );

  return fraction
    ? `${whole.toString()}.${fraction}`
    : whole.toString();
}

/**
 * برای جلوگیری از کمتر محاسبه‌شدن حاشیه امنیت،
 * تقسیم همیشه رو به بالا گرد می‌شود.
 */
function divideRoundUp(
  numerator: bigint,
  denominator: bigint,
): bigint {
  if (
    denominator <=
    BigInt(0)
  ) {
    throw new Error(
      "مخرج محاسبه باید بیشتر از صفر باشد.",
    );
  }

  if (
    numerator <
    BigInt(0)
  ) {
    throw new Error(
      "مقدار منفی در این محاسبه پشتیبانی نمی‌شود.",
    );
  }

  if (
    numerator ===
    BigInt(0)
  ) {
    return BigInt(0);
  }

  return (
    numerator +
    denominator -
    BigInt(1)
  ) / denominator;
}

function createUnavailableDecision({
  referencePrice,
  freshness,
  reason,
}: {
  referencePrice:
    bigint;

  freshness:
    GetMetalRateSaleDecisionInput["freshness"];

  reason:
    MetalRateSaleReason;
}): MetalRateSaleDecision {
  return {
    mode:
      "UNAVAILABLE",

    reason,

    freshnessReason:
      freshness.reason,

    isUsableForSale:
      false,

    ageSeconds:
      freshness.ageSeconds,

    originalPricePerGramToman:
      referencePrice.toString(),

    effectivePricePerGramToman:
      null,

    appliedSafetyMarginPercent:
      "0",

    safetyMarginAmountToman:
      "0",
  };
}

/**
 * تصمیم نهایی برای قابل‌استفاده‌بودن نرخ فلز در فروش.
 *
 * قوانین:
 *
 * ۱. نرخ تازه:
 *    بدون حاشیه امنیت و در حالت LIVE استفاده می‌شود.
 *
 * ۲. نرخ قدیمی با زمان معتبر:
 *    بدون محدودیت زمانی و با حاشیه امنیت تعیین‌شده
 *    در حالت CLOSED_MARKET استفاده می‌شود.
 *
 * ۳. نرخ دارای زمان مفقود، نامعتبر یا آینده:
 *    قابل استفاده برای فروش نیست.
 *
 * ۴. اگر قیمت‌گذاری بازار بسته غیرفعال باشد:
 *    نرخ قدیمی قابل استفاده نیست.
 *
 * closedMarketMaxAgeMinutes عمداً در تصمیم‌گیری استفاده
 * نمی‌شود و فقط برای سازگاری با ساختار فعلی نگه داشته شده است.
 */
export function getMetalRateSaleDecision(
  input: GetMetalRateSaleDecisionInput,
): MetalRateSaleDecision {
  const {
    referencePricePerGramToman,
    freshness,
    closedMarketPricingEnabled,
    closedMarketSafetyMarginPercent,
  } =
    input;

  const referencePrice =
    parsePositiveInteger(
      referencePricePerGramToman,
      "نرخ مرجع هر گرم فلز",
    );

  /*
   * نرخ تازه بدون حاشیه امنیت قابل استفاده است.
   */
  if (
    !freshness.isStale
  ) {
    return {
      mode:
        "LIVE",

      reason:
        "LIVE_RATE",

      freshnessReason:
        freshness.reason,

      isUsableForSale:
        true,

      ageSeconds:
        freshness.ageSeconds,

      originalPricePerGramToman:
        referencePrice.toString(),

      effectivePricePerGramToman:
        referencePrice.toString(),

      appliedSafetyMarginPercent:
        "0",

      safetyMarginAmountToman:
        "0",
    };
  }

  /*
   * timestamp مفقود، نامعتبر یا مربوط به آینده
   * نباید وارد حالت بازار بسته شود.
   */
  if (
    freshness.reason !==
      "STALE" ||
    freshness.ageSeconds ===
      null ||
    !Number.isFinite(
      freshness.ageSeconds,
    ) ||
    freshness.ageSeconds <
      0
  ) {
    return createUnavailableDecision({
      referencePrice,

      freshness,

      reason:
        "SOURCE_TIME_INVALID",
    });
  }

  /*
   * استفاده از نرخ قدیمی فقط زمانی مجاز است
   * که سیاست قیمت‌گذاری بازار بسته فعال باشد.
   */
  if (
    !closedMarketPricingEnabled
  ) {
    return createUnavailableDecision({
      referencePrice,

      freshness,

      reason:
        "CLOSED_MARKET_DISABLED",
    });
  }

  /*
   * محدودیت ۱۲ ساعته حذف شده است.
   *
   * در تمام مدت قدیمی‌بودن نرخ، آخرین نرخ معتبر
   * همراه با حاشیه امنیت استفاده می‌شود.
   */
  const safetyMarginPercent =
    parseSafetyMarginPercent(
      closedMarketSafetyMarginPercent,
    );

  const safetyMarginAmount =
    divideRoundUp(
      referencePrice *
        safetyMarginPercent,

      PERCENT_DENOMINATOR,
    );

  const effectivePrice =
    referencePrice +
    safetyMarginAmount;

  return {
    mode:
      "CLOSED_MARKET",

    reason:
      "CLOSED_MARKET_RATE",

    freshnessReason:
      freshness.reason,

    isUsableForSale:
      true,

    ageSeconds:
      freshness.ageSeconds,

    originalPricePerGramToman:
      referencePrice.toString(),

    effectivePricePerGramToman:
      effectivePrice.toString(),

    appliedSafetyMarginPercent:
      formatScaledPercent(
        safetyMarginPercent,
      ),

    safetyMarginAmountToman:
      safetyMarginAmount.toString(),
  };
}