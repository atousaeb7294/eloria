import { PACKAGING_TOMAN } from "@/lib/commerce-policy";
export type MaterialType =
  | "GOLD"
  | "SILVER";

export type MakingChargeType =
  | "NONE"
  | "FIXED"
  | "PER_GRAM"
  | "PERCENT"
  | "COMBINED";

export type DecimalInput =
  | string
  | number
  | bigint;

export type JewelryPriceInput = {
  material: MaterialType;
  formulaVersion?: "IR_JEWELRY_V1" | "ELORIA_2026_V2";

  /**
   * وزن محصول برحسب گرم.
   * برای جلوگیری از خطای اعشاری بهتر است به شکل رشته ارسال شود:
   * "3.250"
   */
  weightGrams: DecimalInput;

  /**
   * خلوص محصول بر مبنای هزار.
   *
   * نمونه:
   * طلای ۱۸ عیار = 750
   * طلای ۲۴ عیار = 999
   * نقره استرلینگ = 925
   */
  productPurity: number;

  /**
   * نرخ هر گرم فلز مرجع به تومان.
   *
   * نمونه:
   * نرخ طلای ۱۸ عیار با خلوص مرجع 750
   * نرخ نقره خالص با خلوص مرجع 999
   */
  referencePricePerGramToman: DecimalInput;

  /**
   * خلوص نرخ مرجع.
   *
   * طلا: 750
   * نقره: 999
   */
  referencePurity: number;

  makingChargeType: MakingChargeType;

  /**
   * اجرت ثابت کل محصول به تومان.
   */
  makingChargeFixedToman?: DecimalInput;

  /**
   * اجرت به‌ازای هر گرم به تومان.
   */
  makingChargePerGramToman?: DecimalInput;

  /**
   * درصد اجرت از ارزش فلز.
   *
   * نمونه: "12.5"
   */
  makingChargePercent?: DecimalInput;

  /**
   * هزینه اختصاصی طراحی و اجرای هنری الوریا.
   */
  artisticFeeToman?: DecimalInput;

  /**
   * درصد سود فروشنده.
   *
   * نمونه: "7"
   */
  profitPercent: DecimalInput;

  /**
   * درصد مالیات.
   *
   * نمونه: "10"
   */
  taxPercent: DecimalInput;

  /**
   * آیا ارزش خود فلز نیز مشمول مالیات است؟
   *
   * برای طلای ساخته‌شده در سیاست فعلی false است.
   * برای سایر فلزات از تنظیمات دیتابیس خوانده می‌شود.
   */
  taxMetalValue: boolean;

  /**
   * گرد کردن قیمت نهایی.
   *
   * 1 = بدون گرد کردن اضافی
   * 1000 = گرد کردن به نزدیک‌ترین هزار تومان
   */
  roundingStepToman?: DecimalInput;
};

export type JewelryPriceResult = {
  formulaVersion: "IR_JEWELRY_V1" | "ELORIA_2026_V2";
  packagingToman?: string;
  currency: "TOMAN";
  material: MaterialType;

  weightGrams: string;
  productPurity: number;
  referencePurity: number;
  referencePricePerGramToman: string;

  purityRatio: string;

  metalValueToman: string;

  makingChargeFixedToman: string;
  makingChargePerGramTotalToman: string;
  makingChargePercentTotalToman: string;
  makingChargeTotalToman: string;

  artisticFeeToman: string;

  profitBaseToman: string;
  profitPercent: string;
  profitToman: string;

  taxBaseToman: string;
  taxPercent: string;
  taxMetalValue: boolean;
  taxToman: string;

  subtotalBeforeTaxToman: string;
  finalBeforeRoundingToman: string;
  roundingAdjustmentToman: string;
  finalPriceToman: string;
  components?: Array<{
    material: MaterialType;
    weightGrams: string;
    productPurity: number;
    referencePurity: number;
    referencePricePerGramToman: string;
    metalValueToman: string;
    makingChargeToman: string;
    profitToman: string;
    taxToman: string;
  }>;
};

export type CompositeMetalInput = {
  material: MaterialType;
  weightGrams: DecimalInput;
  productPurity: number;
  referencePricePerGramToman: DecimalInput;
  referencePurity: number;
};

const WEIGHT_SCALE = 3;
const PERCENT_SCALE = 3;

function powerOfTen(scale: number) {
  let result = BigInt(1);

  for (
    let index = 0;
    index < scale;
    index += 1
  ) {
    result *= BigInt(10);
  }

  return result;
}

function normalizeDecimalInput(
  value: DecimalInput,
  label: string,
) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(
        `${label} باید عدد معتبر باشد.`,
      );
    }

    return value.toString();
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new Error(
      `${label} نمی‌تواند خالی باشد.`,
    );
  }

  return normalized;
}

function parseNonNegativeScaled(
  value: DecimalInput,
  scale: number,
  label: string,
) {
  const normalized =
    normalizeDecimalInput(
      value,
      label,
    );

  if (
    !/^\d+(?:\.\d+)?$/.test(
      normalized,
    )
  ) {
    throw new Error(
      `${label} باید عدد مثبت یا صفر باشد.`,
    );
  }

  const [wholePart, fractionPart = ""] =
    normalized.split(".");

  const extraFraction =
    fractionPart.slice(scale);

  if (
    extraFraction.length > 0 &&
    /[1-9]/.test(extraFraction)
  ) {
    throw new Error(
      `${label} حداکثر ${scale} رقم اعشار می‌پذیرد.`,
    );
  }

  const normalizedFraction =
    fractionPart
      .slice(0, scale)
      .padEnd(scale, "0");

  const factor = powerOfTen(scale);

  const wholeValue =
    BigInt(wholePart) * factor;

  const fractionValue =
    normalizedFraction.length > 0
      ? BigInt(normalizedFraction)
      : BigInt(0);

  return wholeValue + fractionValue;
}

function parsePositiveScaled(
  value: DecimalInput,
  scale: number,
  label: string,
) {
  const parsed =
    parseNonNegativeScaled(
      value,
      scale,
      label,
    );

  if (parsed <= BigInt(0)) {
    throw new Error(
      `${label} باید بیشتر از صفر باشد.`,
    );
  }

  return parsed;
}

function validatePurity(
  value: number,
  label: string,
) {
  if (
    !Number.isInteger(value) ||
    value <= 0 ||
    value > 1000
  ) {
    throw new Error(
      `${label} باید عدد صحیح بین ۱ تا ۱۰۰۰ باشد.`,
    );
  }

  return value;
}

function parsePercent(
  value: DecimalInput,
  label: string,
  maximum = 100,
) {
  const parsed =
    parseNonNegativeScaled(
      value,
      PERCENT_SCALE,
      label,
    );

  const maximumScaled =
    BigInt(maximum) *
    powerOfTen(PERCENT_SCALE);

  if (parsed > maximumScaled) {
    throw new Error(
      `${label} نمی‌تواند بیشتر از ${maximum} درصد باشد.`,
    );
  }

  return parsed;
}

function divideRoundHalfUp(
  numerator: bigint,
  denominator: bigint,
) {
  if (denominator <= BigInt(0)) {
    throw new Error(
      "مخرج محاسبه باید بیشتر از صفر باشد.",
    );
  }

  if (numerator < BigInt(0)) {
    throw new Error(
      "این موتور مقدار منفی را پشتیبانی نمی‌کند.",
    );
  }

  return (
    numerator +
    denominator / BigInt(2)
  ) / denominator;
}

function calculatePercentAmount(
  baseAmount: bigint,
  percentScaled: bigint,
) {
  const denominator =
    BigInt(100) *
    powerOfTen(PERCENT_SCALE);

  return divideRoundHalfUp(
    baseAmount * percentScaled,
    denominator,
  );
}

function roundToStep(
  value: bigint,
  step: bigint,
) {
  if (step <= BigInt(0)) {
    throw new Error(
      "گام گرد کردن باید بیشتر از صفر باشد.",
    );
  }

  if (step === BigInt(1)) {
    return value;
  }

  return (
    divideRoundHalfUp(value, step) *
    step
  );
}

function formatScaledValue(
  value: bigint,
  scale: number,
) {
  if (scale === 0) {
    return value.toString();
  }

  const factor = powerOfTen(scale);
  const whole = value / factor;
  const fraction = (
    value % factor
  )
    .toString()
    .padStart(scale, "0")
    .replace(/0+$/, "");

  return fraction
    ? `${whole.toString()}.${fraction}`
    : whole.toString();
}

function includesFixedCharge(
  type: MakingChargeType,
) {
  return (
    type === "FIXED" ||
    type === "COMBINED"
  );
}

function includesPerGramCharge(
  type: MakingChargeType,
) {
  return (
    type === "PER_GRAM" ||
    type === "COMBINED"
  );
}

function includesPercentCharge(
  type: MakingChargeType,
) {
  return (
    type === "PERCENT" ||
    type === "COMBINED"
  );
}

export function calculateJewelryPrice(
  input: JewelryPriceInput,
): JewelryPriceResult {
  const productPurity =
    validatePurity(
      input.productPurity,
      "عیار محصول",
    );

  const referencePurity =
    validatePurity(
      input.referencePurity,
      "عیار مرجع",
    );

  const weightMilliGrams =
    parsePositiveScaled(
      input.weightGrams,
      WEIGHT_SCALE,
      "وزن محصول",
    );

  const referencePricePerGram =
    parsePositiveScaled(
      input.referencePricePerGramToman,
      0,
      "نرخ هر گرم فلز",
    );

  const makingChargeFixed =
    parseNonNegativeScaled(
      input.makingChargeFixedToman ??
        "0",
      0,
      "اجرت ثابت",
    );

  const makingChargePerGram =
    parseNonNegativeScaled(
      input.makingChargePerGramToman ??
        "0",
      0,
      "اجرت گرمی",
    );

  const makingChargePercent =
    parsePercent(
      input.makingChargePercent ??
        "0",
      "درصد اجرت",
      100,
    );

  const artisticFee =
    parseNonNegativeScaled(
      input.artisticFeeToman ?? "0",
      0,
      "هزینه کار هنری",
    );

  const profitPercent =
    parsePercent(
      input.profitPercent,
      "درصد سود",
      100,
    );

  const taxPercent =
    parsePercent(
      input.taxPercent,
      "درصد مالیات",
      100,
    );

  const roundingStep =
    parsePositiveScaled(
      input.roundingStepToman ?? "1",
      0,
      "گام گرد کردن",
    );

  /*
   * ارزش فلز:
   *
   * نرخ مرجع × وزن × عیار محصول
   * --------------------------------
   * ۱۰۰۰ × عیار مرجع
   *
   * وزن با دقت هزارم گرم ذخیره شده است.
   */
  const metalValue =
    divideRoundHalfUp(
      referencePricePerGram *
        weightMilliGrams *
        BigInt(productPurity),
      powerOfTen(WEIGHT_SCALE) *
        BigInt(referencePurity),
    );

  const fixedChargeTotal =
    includesFixedCharge(
      input.makingChargeType,
    )
      ? makingChargeFixed
      : BigInt(0);

  const perGramChargeTotal =
    includesPerGramCharge(
      input.makingChargeType,
    )
      ? divideRoundHalfUp(
          makingChargePerGram *
            weightMilliGrams,
          powerOfTen(WEIGHT_SCALE),
        )
      : BigInt(0);

  const percentChargeTotal =
    includesPercentCharge(
      input.makingChargeType,
    )
      ? calculatePercentAmount(
          metalValue,
          makingChargePercent,
        )
      : BigInt(0);

  const makingChargeTotal =
    fixedChargeTotal +
    perGramChargeTotal +
    percentChargeTotal;

  /*
   * سود فروشنده روی ارزش فلز،
   * اجرت و هزینه کار هنری محاسبه می‌شود.
   */
  const profitBase = input.formulaVersion === "ELORIA_2026_V2"
    ? metalValue
    : metalValue + makingChargeTotal + artisticFee;

  const profit =
    calculatePercentAmount(
      profitBase,
      profitPercent,
    );

  /*
   * در مصنوعات طلا، اصل فلز مشمول مالیات نیست.
   * اجرت، کار هنری و سود مشمول مالیات‌اند.
   *
   * برای فلزات دیگر، taxMetalValue از
   * PricingPolicy دیتابیس خوانده می‌شود.
   */
  const taxBase =
    makingChargeTotal +
    (input.formulaVersion === "ELORIA_2026_V2" ? 0n : artisticFee) +
    profit +
    (input.taxMetalValue
      ? metalValue
      : BigInt(0));

  const tax =
    calculatePercentAmount(
      taxBase,
      taxPercent,
    );

  const subtotalBeforeTax =
    metalValue +
    makingChargeTotal +
    artisticFee +
    profit;

  const packaging = input.formulaVersion === "ELORIA_2026_V2" ? PACKAGING_TOMAN : 0n;
  const finalBeforeRounding =
    subtotalBeforeTax + tax + packaging;

  const finalPrice =
    roundToStep(
      finalBeforeRounding,
      roundingStep,
    );

  const roundingAdjustment =
    finalPrice -
    finalBeforeRounding;

  return {
    formulaVersion: input.formulaVersion ?? "IR_JEWELRY_V1",
    packagingToman: packaging.toString(),

    currency: "TOMAN",
    material: input.material,

    weightGrams:
      formatScaledValue(
        weightMilliGrams,
        WEIGHT_SCALE,
      ),

    productPurity,
    referencePurity,

    referencePricePerGramToman:
      referencePricePerGram.toString(),

    purityRatio:
      `${productPurity}/${referencePurity}`,

    metalValueToman:
      metalValue.toString(),

    makingChargeFixedToman:
      fixedChargeTotal.toString(),

    makingChargePerGramTotalToman:
      perGramChargeTotal.toString(),

    makingChargePercentTotalToman:
      percentChargeTotal.toString(),

    makingChargeTotalToman:
      makingChargeTotal.toString(),

    artisticFeeToman:
      artisticFee.toString(),

    profitBaseToman:
      profitBase.toString(),

    profitPercent:
      formatScaledValue(
        profitPercent,
        PERCENT_SCALE,
      ),

    profitToman:
      profit.toString(),

    taxBaseToman:
      taxBase.toString(),

    taxPercent:
      formatScaledValue(
        taxPercent,
        PERCENT_SCALE,
      ),

    taxMetalValue:
      input.taxMetalValue,

    taxToman:
      tax.toString(),

    subtotalBeforeTaxToman:
      subtotalBeforeTax.toString(),

    finalBeforeRoundingToman:
      finalBeforeRounding.toString(),

    roundingAdjustmentToman:
      roundingAdjustment.toString(),

    finalPriceToman:
      finalPrice.toString(),

    components: [{
      material: input.material,
      weightGrams: formatScaledValue(weightMilliGrams, WEIGHT_SCALE),
      productPurity,
      referencePurity,
      referencePricePerGramToman: referencePricePerGram.toString(),
      metalValueToman: metalValue.toString(),
      makingChargeToman: makingChargeTotal.toString(),
      profitToman: profit.toString(),
      taxToman: tax.toString(),
    }],
  };
}
/** Store policy: packaging per piece; delivery is charged once per order. */
export function calculateEloriaJewelryPrice(input: JewelryPriceInput): JewelryPriceResult {
  const gold = input.material === "GOLD";
  return calculateJewelryPrice({
    ...input,
    formulaVersion: "ELORIA_2026_V2",
    productPurity: gold ? input.productPurity : input.referencePurity,
    makingChargeType: gold ? "PERCENT" : "NONE",
    makingChargePercent: gold ? "8" : "0",
    makingChargeFixedToman: "0",
    makingChargePerGramToman: "0",
    profitPercent: gold ? "7" : "0",
    taxPercent: gold ? "9" : "0",
    taxMetalValue: false,
    roundingStepToman: "1",
  });
}

/**
 * حسابرسی محصول ترکیبی بدون تغییر فرمول ELORIA_2026_V2:
 * هر فلز با قواعد فعلی خودش محاسبه می‌شود، سپس هزینهٔ هنری و بسته‌بندی
 * فقط یک‌بار در سطح محصول افزوده می‌شوند.
 */
export function calculateEloriaCompositeJewelryPrice(input: {
  primaryMaterial: MaterialType;
  metals: CompositeMetalInput[];
  artisticFeeToman?: DecimalInput;
  roundingStepToman?: DecimalInput;
}): JewelryPriceResult {
  if (input.metals.length < 2) throw new Error("محصول ترکیبی باید حداقل دو جزء فلزی داشته باشد.");

  const components = input.metals.map((metal) => calculateEloriaJewelryPrice({
    material: metal.material,
    weightGrams: metal.weightGrams,
    productPurity: metal.productPurity,
    referencePricePerGramToman: metal.referencePricePerGramToman,
    referencePurity: metal.referencePurity,
    makingChargeType: "NONE",
    artisticFeeToman: "0",
    profitPercent: "0",
    taxPercent: "0",
    taxMetalValue: false,
    roundingStepToman: "1",
  }));

  const sum = (key: keyof JewelryPriceResult) => components.reduce((total, part) => {
    const value = part[key];
    return total + BigInt(typeof value === "string" ? value : "0");
  }, 0n);
  const artisticFee = parseNonNegativeScaled(input.artisticFeeToman ?? "0", 0, "هزینه کار هنری");
  const packaging = PACKAGING_TOMAN;
  const metalValue = sum("metalValueToman");
  const makingCharge = sum("makingChargeTotalToman");
  const profit = sum("profitToman");
  const tax = sum("taxToman");
  const subtotalBeforeTax = metalValue + makingCharge + artisticFee + profit;
  const finalBeforeRounding = subtotalBeforeTax + tax + packaging;
  const roundingStep = parsePositiveScaled(input.roundingStepToman ?? "1", 0, "گام گرد کردن");
  const finalPrice = roundToStep(finalBeforeRounding, roundingStep);
  const totalWeight = input.metals.reduce((total, metal) => total + parseNonNegativeScaled(metal.weightGrams, WEIGHT_SCALE, "وزن فلز"), 0n);
  const primary = components.find((part) => part.material === input.primaryMaterial) ?? components[0];

  return {
    formulaVersion: "ELORIA_2026_V2",
    packagingToman: packaging.toString(),
    currency: "TOMAN",
    material: input.primaryMaterial,
    weightGrams: formatScaledValue(totalWeight, WEIGHT_SCALE),
    productPurity: primary.productPurity,
    referencePurity: primary.referencePurity,
    referencePricePerGramToman: primary.referencePricePerGramToman,
    purityRatio: primary.purityRatio,
    metalValueToman: metalValue.toString(),
    makingChargeFixedToman: sum("makingChargeFixedToman").toString(),
    makingChargePerGramTotalToman: sum("makingChargePerGramTotalToman").toString(),
    makingChargePercentTotalToman: sum("makingChargePercentTotalToman").toString(),
    makingChargeTotalToman: makingCharge.toString(),
    artisticFeeToman: artisticFee.toString(),
    profitBaseToman: sum("profitBaseToman").toString(),
    profitPercent: "0.000",
    profitToman: profit.toString(),
    taxBaseToman: sum("taxBaseToman").toString(),
    taxPercent: "0.000",
    taxMetalValue: false,
    taxToman: tax.toString(),
    subtotalBeforeTaxToman: subtotalBeforeTax.toString(),
    finalBeforeRoundingToman: finalBeforeRounding.toString(),
    roundingAdjustmentToman: (finalPrice - finalBeforeRounding).toString(),
    finalPriceToman: finalPrice.toString(),
    components: components.map((part) => ({
      material: part.material,
      weightGrams: part.weightGrams,
      productPurity: part.productPurity,
      referencePurity: part.referencePurity,
      referencePricePerGramToman: part.referencePricePerGramToman,
      metalValueToman: part.metalValueToman,
      makingChargeToman: part.makingChargeTotalToman,
      profitToman: part.profitToman,
      taxToman: part.taxToman,
    })),
  };
}
