import assert from "node:assert/strict";
import { calculateEloriaCompositeJewelryPrice, calculateEloriaJewelryPrice } from "../src/lib/pricing-engine";
import { calculateShipping } from "../src/lib/shipping";
const base = { material: "GOLD" as const, weightGrams: "2", productPurity: 750, referencePurity: 750, referencePricePerGramToman: "10000000", makingChargeType: "NONE" as const, artisticFeeToman: "500000", profitPercent: "0", taxPercent: "0", taxMetalValue: false };
const gold = calculateEloriaJewelryPrice(base);
assert.equal(gold.metalValueToman, "20000000");
assert.equal(gold.makingChargeTotalToman, "1600000");
assert.equal(gold.profitToman, "1400000");
assert.equal(gold.taxToman, "270000");
assert.equal(gold.finalPriceToman, "23840000");
assert.equal(gold.packagingToman, "70000");
assert.equal(calculateEloriaJewelryPrice({...base, artisticFeeToman:"0"}).taxToman, gold.taxToman);
const silver = calculateEloriaJewelryPrice({...base, material:"SILVER", referencePurity:999, productPurity:925, referencePricePerGramToman:"100000", weightGrams:"3.25"});
assert.equal(silver.metalValueToman, "325000");
assert.equal(silver.finalPriceToman,"895000");
assert.equal(silver.taxToman,"0");
assert.equal(silver.profitToman,"0");
const composite = calculateEloriaCompositeJewelryPrice({
  primaryMaterial: "GOLD",
  metals: [
    { material: "GOLD", weightGrams: "2", productPurity: 750, referencePurity: 750, referencePricePerGramToman: "10000000" },
    { material: "SILVER", weightGrams: "3.25", productPurity: 999, referencePurity: 999, referencePricePerGramToman: "100000" },
  ],
  artisticFeeToman: "500000",
});
assert.equal(composite.metalValueToman, "20325000");
assert.equal(composite.makingChargeTotalToman, "1600000");
assert.equal(composite.profitToman, "1400000");
assert.equal(composite.taxToman, "270000");
assert.equal(composite.finalPriceToman, "24165000");
assert.equal(composite.packagingToman, "70000");
assert.equal(composite.components?.length, 2);
assert.equal(calculateShipping("0").shippingToman,"0");
assert.equal(calculateShipping(gold.finalPriceToman).shippingToman,"170000");
process.env.ELORIA_SHIPPING_FLAT_TOMAN="0";
process.env.ELORIA_FREE_SHIPPING_FROM_TOMAN="1";
assert.equal(calculateShipping("100000000").shippingToman,"170000");
assert.equal(2n * BigInt(gold.finalPriceToman) + BigInt(calculateShipping(gold.finalPriceToman).shippingToman),47850000n);
assert.throws(()=>calculateEloriaJewelryPrice({...base,weightGrams:"-1"}));
console.log("PASS Eloria V2 gold, silver, quantities, fixed fees and negative inputs");
