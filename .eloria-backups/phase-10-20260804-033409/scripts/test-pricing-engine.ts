import assert from "node:assert/strict";

import {
  calculateJewelryPrice,
  type JewelryPriceResult,
} from "../src/lib/pricing-engine";

function selectImportantValues(
  result: JewelryPriceResult,
) {
  return {
    metalValueToman:
      result.metalValueToman,

    makingChargeTotalToman:
      result.makingChargeTotalToman,

    artisticFeeToman:
      result.artisticFeeToman,

    profitToman:
      result.profitToman,

    taxBaseToman:
      result.taxBaseToman,

    taxToman:
      result.taxToman,

    finalPriceToman:
      result.finalPriceToman,
  };
}

function testGoldWithPerGramCharge() {
  const result =
    calculateJewelryPrice({
      material: "GOLD",

      weightGrams: "3",

      productPurity: 750,

      referencePricePerGramToman:
        "17878900",

      referencePurity: 750,

      makingChargeType:
        "PER_GRAM",

      makingChargePerGramToman:
        "500000",

      artisticFeeToman:
        "2000000",

      profitPercent: "7",

      taxPercent: "10",

      taxMetalValue: false,

      roundingStepToman: "1",
    });

  assert.deepEqual(
    selectImportantValues(result),
    {
      metalValueToman:
        "53636700",

      makingChargeTotalToman:
        "1500000",

      artisticFeeToman:
        "2000000",

      profitToman:
        "3999569",

      taxBaseToman:
        "7499569",

      taxToman:
        "749957",

      finalPriceToman:
        "61886226",
    },
  );
}

function testSilverPurityConversion() {
  const result =
    calculateJewelryPrice({
      material: "SILVER",

      weightGrams: "10",

      productPurity: 925,

      referencePricePerGramToman:
        "358807",

      referencePurity: 999,

      makingChargeType: "NONE",

      artisticFeeToman: "0",

      profitPercent: "0",

      taxPercent: "10",

      taxMetalValue: true,

      roundingStepToman: "1",
    });

  assert.deepEqual(
    selectImportantValues(result),
    {
      metalValueToman:
        "3322287",

      makingChargeTotalToman:
        "0",

      artisticFeeToman:
        "0",

      profitToman:
        "0",

      taxBaseToman:
        "3322287",

      taxToman:
        "332229",

      finalPriceToman:
        "3654516",
    },
  );
}

function testCombinedMakingCharge() {
  const result =
    calculateJewelryPrice({
      material: "GOLD",

      weightGrams: "2.500",

      productPurity: 750,

      referencePricePerGramToman:
        "10000000",

      referencePurity: 750,

      makingChargeType:
        "COMBINED",

      makingChargeFixedToman:
        "100000",

      makingChargePerGramToman:
        "200000",

      makingChargePercent: "5",

      artisticFeeToman:
        "1000000",

      profitPercent: "7",

      taxPercent: "10",

      taxMetalValue: false,

      roundingStepToman: "1",
    });

  assert.deepEqual(
    selectImportantValues(result),
    {
      metalValueToman:
        "25000000",

      makingChargeTotalToman:
        "1850000",

      artisticFeeToman:
        "1000000",

      profitToman:
        "1949500",

      taxBaseToman:
        "4799500",

      taxToman:
        "479950",

      finalPriceToman:
        "30279450",
    },
  );
}

function testFinalPriceRounding() {
  const result =
    calculateJewelryPrice({
      material: "GOLD",

      weightGrams: "2.500",

      productPurity: 750,

      referencePricePerGramToman:
        "10000000",

      referencePurity: 750,

      makingChargeType:
        "COMBINED",

      makingChargeFixedToman:
        "100000",

      makingChargePerGramToman:
        "200000",

      makingChargePercent: "5",

      artisticFeeToman:
        "1000000",

      profitPercent: "7",

      taxPercent: "10",

      taxMetalValue: false,

      roundingStepToman:
        "1000",
    });

  assert.equal(
    result.finalBeforeRoundingToman,
    "30279450",
  );

  assert.equal(
    result.roundingAdjustmentToman,
    "-450",
  );

  assert.equal(
    result.finalPriceToman,
    "30279000",
  );
}

function testInvalidPurity() {
  assert.throws(
    () =>
      calculateJewelryPrice({
        material: "GOLD",

        weightGrams: "1",

        productPurity: 0,

        referencePricePerGramToman:
          "10000000",

        referencePurity: 750,

        makingChargeType:
          "NONE",

        profitPercent: "7",

        taxPercent: "10",

        taxMetalValue: false,
      }),

    /عیار محصول/,
  );
}

function main() {
  testGoldWithPerGramCharge();
  testSilverPurityConversion();
  testCombinedMakingCharge();
  testFinalPriceRounding();
  testInvalidPurity();

  console.log(
    "✓ تمام ۵ تست موتور قیمت‌گذاری با موفقیت انجام شد.",
  );
}

main();