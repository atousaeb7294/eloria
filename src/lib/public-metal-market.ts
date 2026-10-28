import type { FetchedMetalRate } from "./brs-market";
import { SILVER_PRICING_BASIS, SILVER_PRICING_DIVISOR } from "./commerce-policy";
import { assessMetalRateAnomaly } from "./metal-rate-anomaly";

export const METAL_PROVIDER_URLS = {
  iran: "https://nerkh.jahankhahan.shop/data/live.json",
  silver: "https://api.gold-api.com/price/XAG",
} as const;
const persianDate = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit",
});
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("ساختار پاسخ منبع نرخ معتبر نیست.");
  return value as Record<string, unknown>;
}
function positive(value: unknown, label: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) throw new Error(`${label}: نرخ مثبت و عددی دریافت نشد.`);
  return value;
}
function timestamp(ms: number, now: number) {
  if (!Number.isSafeInteger(ms) || ms <= 0 || ms > now + 300_000) throw new Error("زمان نرخ نامعتبر یا در آینده است.");
  return Math.floor(ms / 1000);
}
function calendarKey(ms: number) {
  const parts = persianDate.formatToParts(ms);
  const part = (name: string) => Number(parts.find(p => p.type === name)?.value);
  return part("year") * 10000 + part("month") * 100 + part("day");
}
/** Jalali date, Tehran time. Never substitute request time for market time. */
export function parseNerkhsanjTimestamp(date: unknown, time: unknown, now: number) {
  if (typeof date !== "string" || !/^14\d{2}\/\d{2}\/\d{2}$/.test(date) || typeof time !== "string" || !/^\d{2}:\d{2}$/.test(time))
    throw new Error("نرخ‌سنج: زمان دقیق نرخ موجود نیست؛ نرخ قبلی حفظ می‌شود.");
  const [year, month, day] = date.split("/").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  if (year < 1402 || month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) throw new Error("نرخ‌سنج: تاریخ یا ساعت نامعتبر است.");
  const target = year * 10000 + month * 100 + day;
  let lower = Math.floor(Date.UTC(year + 621, 0, 1) / 86400000);
  let upper = Math.floor(Date.UTC(year + 622, 3, 1) / 86400000);
  while (lower <= upper) {
    const middle = Math.floor((lower + upper) / 2), key = calendarKey(middle * 86400000);
    if (key < target) lower = middle + 1;
    else if (key > target) upper = middle - 1;
    else {
      const gregorian = new Date(middle * 86400000).toISOString().slice(0, 10);
      // Iran uses UTC+03:30 year-round for the supported dates (1402 onward).
      return timestamp(Date.parse(`${gregorian}T${time}:00+03:30`), now);
    }
  }
  throw new Error("نرخ‌سنج: تاریخ شمسی نامعتبر است.");
}
function safeRate(rate: FetchedMetalRate) {
  const a = assessMetalRateAnomaly({ material: rate.material, incomingPricePerGramToman: rate.pricePerGramToman, currentPricePerGramToman: null });
  if (!a.safe) throw new Error(`${rate.material}: ${a.reason}`);
  return rate;
}
type Options = { fetchImpl?: typeof fetch; now?: () => number; requestTimeoutMs?: number; warn?: (message: string) => void };
/** Fixed HTTPS endpoints; process-local one-minute cache includes failed requests. */
export function createPublicMetalRateFetcher(options: Options = {}) {
  const now = options.now ?? Date.now;
  const cache = new Map<string, { until: number; pending: Promise<Record<string, unknown>> }>();
  function read(url: string, label: string) {
    const previous = cache.get(url);
    if (previous && now() < previous.until) return previous.pending;
    const until = now() + 60_000;
    const pending = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.requestTimeoutMs ?? 15000);
      try {
        const response = await (options.fetchImpl ?? fetch)(url, { headers: { Accept: "application/json" }, cache: "no-store", redirect: "error", signal: controller.signal });
        if (!response.ok) throw new Error(`${label}: HTTP ${response.status}`);
        const body = await response.text();
        if (body.length > 65536) throw new Error(`${label}: پاسخ بیش از حد بزرگ است.`);
        return record(JSON.parse(body));
      } catch (error) {
        if (controller.signal.aborted) throw new Error(`${label}: زمان دریافت پاسخ تمام شد.`);
        if (error instanceof Error && error.message.startsWith(`${label}:`)) throw error;
        throw new Error(`${label}: دریافت پاسخ معتبر ممکن نشد.`);
      } finally { clearTimeout(timer); }
    })();
    cache.set(url, { until, pending });
    return pending;
  }
  return async function fetchRates(): Promise<FetchedMetalRate[]> {
    const [local, global] = await Promise.allSettled([read(METAL_PROVIDER_URLS.iran, "نرخ‌سنج"), read(METAL_PROVIDER_URLS.silver, "Gold-API")]);
    if (local.status === "rejected") throw local.reason;
    const iran = local.value, values = record(iran.rates);
    const sourceTimeUnix = parseNerkhsanjTimestamp(iran.date, iran.time, now());
    const rates: FetchedMetalRate[] = [], failures: string[] = [];
    try {
      rates.push(safeRate({ material: "GOLD", pricePerGramToman: Math.round(positive(values.gold, "طلای ۱۸ عیار")), referencePurity: 750,
        source: "NERKHSANJ_API", sourceSymbol: "IR_GOLD_18K", sourceUnit: "تومان/گرم", sourceDate: String(iran.date), sourceTime: String(iran.time), sourceTimeUnix,
        rawPayload: { gold: { price: values.gold, unit: "تومان", purity: 750, time_unix: sourceTimeUnix }, provider: "NERKHSANJ", providerUrl: METAL_PROVIDER_URLS.iran, date: iran.date, time: iran.time } }));
    } catch (error) { failures.push(String(error)); }
    try {
      if (global.status === "rejected") throw global.reason;
      const silver = global.value;
      if (silver.symbol !== "XAG" || silver.currency !== "USD" || silver.exchangeRate !== 1) throw new Error("Gold-API: نماد یا واحد نقره معتبر نیست.");
      if (typeof silver.updatedAt !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(silver.updatedAt)) throw new Error("Gold-API: زمان نرخ معتبر نیست.");
      const silverTime = timestamp(Date.parse(silver.updatedAt), now());
      if (new Date(silverTime * 1000).toISOString().slice(0, 19) !== silver.updatedAt.slice(0, 19)) throw new Error("Gold-API: تاریخ نرخ معتبر نیست.");
      const usdPriceToman = positive(values.dollar, "دلار آزاد"), ounceUsd = positive(silver.price, "اونس نقره");
      const oldest = Math.min(sourceTimeUnix, silverTime);
      rates.push(safeRate({ material: "SILVER",
        // Preserve Eloria's commercial divisor 10.31, NOT physical troy-ounce grams.
        pricePerGramToman: Math.round(ounceUsd * usdPriceToman / SILVER_PRICING_DIVISOR), referencePurity: 999,
        source: "NERKHSANJ_GOLD_API", sourceSymbol: "XAGUSD", sourceUnit: "تومان/گرم", sourceTimeUnix: oldest,
        sourceDate: oldest === sourceTimeUnix ? String(iran.date) : silver.updatedAt.slice(0, 10),
        sourceTime: oldest === sourceTimeUnix ? String(iran.time) : silver.updatedAt.slice(11, 19) + "Z",
        rawPayload: { silverOunce: { ...silver, time_unix: silverTime }, usd: { price: usdPriceToman, unit: "تومان", time_unix: sourceTimeUnix, provider: "NERKHSANJ" }, usdPriceToman,
          pricingBasis: SILVER_PRICING_BASIS, pricingDivisor: SILVER_PRICING_DIVISOR, timestampPolicy: "OLDEST_REQUIRED_SOURCE", selectedSourceTimeUnix: oldest } }));
    } catch (error) { failures.push(String(error)); }
    if (!rates.length) throw new Error(failures.join(" | "));
    if (failures.length) (options.warn ?? console.warn)(`Metal sync partial: ${failures.join(" | ")}`);
    return rates;
  };
}
export const fetchPublicMetalRates = createPublicMetalRateFetcher();
