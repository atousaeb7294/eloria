const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

export type SmartCatalogQuery = {
  search: string;
  collectionSlug?: string;
  material?: "GOLD" | "SILVER";
  minPriceToman?: string;
  maxPriceToman?: string;
};

export function normalizePersianSearchText(value: string): string {
  return value
    .replace(/ي/g, "ی")
    .replace(/ى/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/ۀ/g, "ه")
    .replace(/ة/g, "ه")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/[۰-۹]/g, digit => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, digit => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/\s+/g, " ")
    .trim();
}

function moneyToToman(raw: string, unit?: string): string | undefined {
  const digits = normalizePersianSearchText(raw).replace(/[^\d.]/g, "");
  if (!digits) return undefined;
  const numeric = Number(digits);
  if (!Number.isFinite(numeric) || numeric < 0) return undefined;
  const multiplier = unit === "میلیارد" || unit?.toLowerCase() === "billion"
    ? 1_000_000_000
    : unit === "میلیون" || unit?.toLowerCase() === "million" || unit?.toLowerCase() === "m"
      ? 1_000_000
      : unit === "هزار" || unit?.toLowerCase() === "thousand" || unit?.toLowerCase() === "k"
        ? 1_000
        : 1;
  return String(Math.round(numeric * multiplier));
}

const COLLECTION_TERMS: Array<[RegExp, string]> = [
  [/((?:دست\s*بند)|(?:bracelets?)|(?:bangle))/giu, "bracelets"],
  [/((?:گردن\s*بند)|(?:necklaces?))/giu, "necklaces"],
  [/((?:گوش\s*واره)|(?:earrings?))/giu, "earrings"],
];

export function parseSmartCatalogQuery(value: string): SmartCatalogQuery {
  let text = normalizePersianSearchText(value).slice(0, 120);
  const result: SmartCatalogQuery = { search: text };

  for (const [pattern, slug] of COLLECTION_TERMS) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      result.collectionSlug = slug;
      text = text.replace(pattern, " ");
      break;
    }
  }

  if (/(?:^|\s)(?:طلا|طلایی|gold)(?:\s|$)/iu.test(text)) {
    result.material = "GOLD";
    text = text.replace(/(?:^|\s)(?:طلا|طلایی|gold)(?:\s|$)/giu, " ");
  } else if (/(?:^|\s)(?:نقره|نقره‌ای|silver)(?:\s|$)/iu.test(text)) {
    result.material = "SILVER";
    text = text.replace(/(?:^|\s)(?:نقره|نقره‌ای|silver)(?:\s|$)/giu, " ");
  }

  const upperPattern = /(?:زیر|کمتر از|حداکثر|تا|under|below|up to)\s*([\d.]+)\s*(میلیارد|میلیون|هزار|billion|million|thousand|m|k)?(?:\s*تومان)?/iu;
  const upper = text.match(upperPattern);
  if (upper) {
    result.maxPriceToman = moneyToToman(upper[1], upper[2]);
    text = text.replace(upperPattern, " ");
  }

  const lowerPattern = /(?:بالای|بیشتر از|حداقل|از)\s*([\d.]+)\s*(میلیارد|میلیون|هزار|billion|million|thousand|m|k)?(?:\s*تومان)?/iu;
  const lower = text.match(lowerPattern);
  if (lower) {
    result.minPriceToman = moneyToToman(lower[1], lower[2]);
    text = text.replace(lowerPattern, " ");
  }

  result.search = text
    .replace(/(?:برای|با|همراه|دارای|مدل|اثر|جواهر|تومان|قیمت|لطفاً|لطفا|please|show|find|for|with|having)/giu, " ")
    .replace(/\s+/g, " ")
    .trim();

  return result;
}
