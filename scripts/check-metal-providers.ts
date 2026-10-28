// Public read-only probe: no dotenv, Prisma or database access.
import { fetchPublicMetalRates } from "../src/lib/public-metal-market";
import { getMetalRateFreshness } from "../src/lib/metal-rate-freshness";
async function main() {
  const rates = await fetchPublicMetalRates();
  for (const rate of rates) {
    const f = getMetalRateFreshness({ sourceTimeUnix: rate.sourceTimeUnix, staleAfterMinutes: 15 });
    console.log(JSON.stringify({ material: rate.material, source: rate.source, referencePurity: rate.referencePurity, referencePriceToman: rate.pricePerGramToman, sourceTimestamp: f.marketTimestamp?.toISOString(), ageSeconds: f.ageSeconds, statusAt15Minutes: f.reason }));
  }
  console.log("Read-only public API check. No database or environment file was accessed. Silver uses Eloria's commercial divisor 10.31.");
  if (rates.length < 2) { console.error("Partial result: inspect provider warnings."); process.exitCode = 1; }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Provider check failed"); process.exitCode = 1; });
