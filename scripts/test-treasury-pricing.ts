import assert from 'node:assert/strict';
import type { calculateCatalogPrice as CalculateCatalogPrice } from '../src/lib/priced-catalog';
import { calculateEloriaCompositeJewelryPrice } from '../src/lib/pricing-engine';
import { getMetalRateSaleDecision } from '../src/lib/metal-rate-sale-policy';

type Input = Parameters<typeof CalculateCatalogPrice>[0];
async function main() {
process.env.DATABASE_URL ??= 'postgresql://preview:preview@127.0.0.1:5432/preview';
const { calculateCatalogPrice } = await import('../src/lib/priced-catalog');
const now = new Date();
const policy = { staleAfterMinutes: 5, closedMarketPricingEnabled: true, closedMarketMaxAgeMinutes: 14400, closedMarketSafetyMarginPercent: '99', roundingStep: '1' } as unknown as NonNullable<Input['policy']>;
const rate = (price: string, purity: number) => ({ pricePerGram: price, referencePurity: purity, sourceTimeUnix: BigInt(Math.floor(now.getTime() / 1000) - 3600), rawPayload: { pricingBasis: 'ELORIA_SILVER_10_31_V2' } }) as unknown as NonNullable<Input['metalPrice']>;
const gold = rate('10000000', 750), silver = rate('100000', 999);
const product = { pricingMode: 'DYNAMIC', currency: 'TOMAN', material: 'GOLD', hasGold: true, hasSilver: true, goldComponentWeight: '2', silverComponentWeight: '3.25', purityFineness: 750, artisticFee: '500000' } as Input['product'];
const input: Input = { product, policy, metalPrice: gold, now, policies: new Map([['GOLD', policy], ['SILVER', policy]]), prices: new Map([['GOLD', gold], ['SILVER', silver]]) };
const detailed = calculateEloriaCompositeJewelryPrice({ primaryMaterial:'GOLD', metals:[{material:'GOLD',weightGrams:'2',productPurity:750,referencePurity:750,referencePricePerGramToman:'10000000'},{material:'SILVER',weightGrams:'3.25',productPurity:999,referencePurity:999,referencePricePerGramToman:'100000'}],artisticFeeToman:'500000' });
assert.equal(calculateCatalogPrice(input)?.toString(), detailed.finalPriceToman);
assert.equal(calculateCatalogPrice(input), 23895000n);
assert.equal(calculateCatalogPrice({...input,product:{...product,material:'SILVER',purityFineness:999},metalPrice:silver}),23895000n);
assert.equal(calculateCatalogPrice({...input,prices:new Map([['GOLD',gold]])}),null);
assert.equal(calculateCatalogPrice({...input,product:{...product,silverComponentWeight:null}}),null);
const decision = getMetalRateSaleDecision({material:'GOLD',referencePricePerGramToman:'10000000',freshness:{ageSeconds:3600,isStale:true,reason:'STALE'},closedMarketPricingEnabled:true,closedMarketMaxAgeMinutes:14400,closedMarketSafetyMarginPercent:'99'});
assert.equal(decision.effectivePricePerGramToman,'10000000');
assert.equal(decision.appliedSafetyMarginPercent,'0');
assert.equal(detailed.profitToman,'1400000');
assert.equal(detailed.taxToman,'0');
console.log('PASS treasury/catalog parity, mixed metals, single fees, missing rates and zero closed-market markup with normal profit preserved');

}
void main();
