import assert from "node:assert/strict";
import { fetchBrsMetalRates } from "../src/lib/brs-market";
import { silverComparableBaseline } from "../src/lib/commerce-policy";
import { assessMetalRateAnomaly } from "../src/lib/metal-rate-anomaly";
process.env.BRS_API_KEY="test-only";
const original=globalThis.fetch;
const now=Math.floor(Date.now()/1000);
const silverOunce={symbol:"XAGUSD",price:103.1,time_unix:now-60};
const usd={symbol:"USD",price:1000000,unit:"ریال",time_unix:now};
globalThis.fetch=async url=>String(url).includes("Commodity") ? Response.json({metal_precious:[silverOunce]}) : Response.json({gold:{type:[{symbol:"IR_GOLD_18K",price:10000000,unit:"تومان",time_unix:now}]},currency:{free:[usd]}});
async function main(){
  const rates=await fetchBrsMetalRates();
  const silver=rates.find(r=>r.material==="SILVER")!;
  assert.equal(silver.pricePerGramToman,1000000);
  assert.equal(silver.sourceTimeUnix,now-60);
  assert.equal(silver.rawPayload.pricingBasis,"ELORIA_SILVER_10_31_V2");
  const old=Math.round(103.1*100000/31.1034768);
  const input={material:"SILVER",currentSource:"BRS_API",incomingSource:"BRS_API",currentPayload:{silverOunce,usd},incomingPayload:silver.rawPayload,currentPrice:old};
  const baseline=silverComparableBaseline(input);
  assert.ok(Math.abs(baseline-1000000)<3);
  assert.equal(assessMetalRateAnomaly({material:"SILVER",incomingPricePerGramToman:silver.pricePerGramToman,currentPricePerGramToman:baseline}).safe,true);
  assert.equal(assessMetalRateAnomaly({material:"SILVER",incomingPricePerGramToman:2000000,currentPricePerGramToman:baseline}).safe,false);
  assert.equal(silverComparableBaseline({...input,currentPayload:silver.rawPayload,currentPrice:1000000}),1000000);
  assert.equal(silverComparableBaseline({...input,currentSource:"MANUAL"}),old);
  console.log("PASS BRS dollar/rial conversion, silver pricing, oldest timestamp and safe policy transition");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{globalThis.fetch=original;});
