const TROY_OUNCE_GRAMS = 31.1034768;
const REQUEST_TIMEOUT_MS = 15_000;

export type MetalMaterial =
  | "GOLD"
  | "SILVER";

export type FetchedMetalRate = {
  material: MetalMaterial;
  pricePerGramToman: number;
  referencePurity: number;

  source: string;
  sourceSymbol: string;
  sourceUnit: string;

  sourceDate: string | null;
  sourceTime: string | null;
  sourceTimeUnix: number | null;

  rawPayload: Record<
    string,
    unknown
  >;
};

function getRequiredApiKey() {
  const apiKey =
    process.env.BRS_API_KEY?.trim();

  if (!apiKey) {
    throw new Error(
      "متغیر BRS_API_KEY در فایل .env تنظیم نشده است.",
    );
  }

  return apiKey;
}

function buildApiUrl(
  baseUrl: string,
  parameters: Record<
    string,
    string
  > = {},
) {
  const url = new URL(baseUrl);

  url.searchParams.set(
    "key",
    getRequiredApiKey(),
  );

  for (const [key, value] of Object.entries(
    parameters,
  )) {
    url.searchParams.set(key, value);
  }

  return url;
}

async function fetchJson(
  url: URL,
  label: string,
) {
  const controller =
    new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",

      headers: {
        Accept: "application/json",
      },

      cache: "no-store",
      signal: controller.signal,
    });

    const responseText =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `${label}: خطای HTTP ${response.status}`,
      );
    }

    try {
      return JSON.parse(responseText);
    } catch {
      throw new Error(
        `${label}: پاسخ API معتبر نیست.`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `${label}: زمان دریافت پاسخ بیشتر از ۱۵ ثانیه شد.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function convertIranianPriceToToman(
  price: unknown,
  unit: unknown,
) {
  const numericPrice = Number(price);

  if (
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0
  ) {
    throw new Error(
      "قیمت دریافت‌شده از API معتبر نیست.",
    );
  }

  const normalizedUnit = String(
    unit ?? "",
  )
    .trim()
    .replace(/\s+/g, "");

  if (
    normalizedUnit.includes("تومان")
  ) {
    return numericPrice;
  }

  if (
    normalizedUnit.includes("ریال")
  ) {
    return numericPrice / 10;
  }

  throw new Error(
    `واحد پول ناشناخته است: ${String(unit)}`,
  );
}

function normalizeUnixTime(
  value: unknown,
) {
  const numericValue = Number(value);

  return Number.isInteger(numericValue) &&
    numericValue > 0
    ? numericValue
    : null;
}

export async function fetchBrsMetalRates(): Promise<
  FetchedMetalRate[]
> {
  const goldApiUrl =
    process.env.BRS_GOLD_API_URL?.trim() ||
    "https://Api.BrsApi.ir/Market/Gold_Currency_Pro.php";

  const commodityApiUrl =
    process.env.BRS_COMMODITY_API_URL?.trim() ||
    "https://Api.BrsApi.ir/Market/Commodity.php";

  const goldSymbol =
    process.env.BRS_GOLD_SYMBOL?.trim() ||
    "IR_GOLD_18K";

  const usdSymbol =
    process.env.BRS_USD_SYMBOL?.trim() ||
    "USD";

  const silverSymbol =
    process.env.BRS_SILVER_SYMBOL?.trim() ||
    "XAGUSD";

  const marketUrl = buildApiUrl(
    goldApiUrl,
    {
      section: "gold,currency",
    },
  );

  const commodityUrl =
    buildApiUrl(commodityApiUrl);

  const [
    marketResponse,
    commodityResponse,
  ] = await Promise.all([
    fetchJson(
      marketUrl,
      "API طلا و ارز",
    ),

    fetchJson(
      commodityUrl,
      "API نقره",
    ),
  ]);

  if (
    marketResponse?.successful ===
    false
  ) {
    throw new Error(
      marketResponse.message_error ||
        "API طلا پاسخ ناموفق برگرداند.",
    );
  }

  const goldItems =
    marketResponse?.gold?.type;

  if (!Array.isArray(goldItems)) {
    throw new Error(
      "فهرست نرخ‌های طلا در پاسخ API پیدا نشد.",
    );
  }

  const gold18 = goldItems.find(
    (item: Record<string, unknown>) =>
      item.symbol === goldSymbol,
  );

  if (!gold18) {
    throw new Error(
      `نماد ${goldSymbol} در پاسخ طلا پیدا نشد.`,
    );
  }

  const currencyItems =
    marketResponse?.currency?.free;

  if (
    !Array.isArray(currencyItems)
  ) {
    throw new Error(
      "فهرست نرخ ارز در پاسخ API پیدا نشد.",
    );
  }

  const usd = currencyItems.find(
    (item: Record<string, unknown>) =>
      item.symbol === usdSymbol,
  );

  if (!usd) {
    throw new Error(
      `نماد ${usdSymbol} در پاسخ ارز پیدا نشد.`,
    );
  }

  const preciousMetals =
    commodityResponse?.metal_precious;

  if (
    !Array.isArray(preciousMetals)
  ) {
    throw new Error(
      "فهرست فلزات گران‌بها در پاسخ API پیدا نشد.",
    );
  }

  const silverOunce =
    preciousMetals.find(
      (
        item: Record<
          string,
          unknown
        >,
      ) =>
        item.symbol ===
        silverSymbol,
    );

  if (!silverOunce) {
    throw new Error(
      `نماد ${silverSymbol} در پاسخ نقره پیدا نشد.`,
    );
  }

  const goldPricePerGramToman =
    Math.round(
      convertIranianPriceToToman(
        gold18.price,
        gold18.unit,
      ),
    );

  const usdPriceToman =
    convertIranianPriceToToman(
      usd.price,
      usd.unit,
    );

  const silverOunceUsd = Number(
    silverOunce.price,
  );

  if (
    !Number.isFinite(
      silverOunceUsd,
    ) ||
    silverOunceUsd <= 0
  ) {
    throw new Error(
      "قیمت انس نقره معتبر نیست.",
    );
  }

  const silverPricePerGramToman =
    Math.round(
      (silverOunceUsd *
        usdPriceToman) /
        TROY_OUNCE_GRAMS,
    );

  return [
    {
      material: "GOLD",

      pricePerGramToman:
        goldPricePerGramToman,

      // طلای ۱۸ عیار معادل خلوص ۷۵۰
      referencePurity: 750,

      source: "BRS_API",
      sourceSymbol: goldSymbol,
      sourceUnit: String(
        gold18.unit ?? "تومان",
      ),

      sourceDate:
        typeof gold18.date ===
        "string"
          ? gold18.date
          : null,

      sourceTime:
        typeof gold18.time ===
        "string"
          ? gold18.time
          : null,

      sourceTimeUnix:
        normalizeUnixTime(
          gold18.time_unix,
        ),

      rawPayload: {
        gold: gold18,
      },
    },

    {
      material: "SILVER",

      pricePerGramToman:
        silverPricePerGramToman,

      // نرخ محاسبه‌شده برای نقره خالص ۹۹۹
      referencePurity: 999,

      source: "BRS_API",
      sourceSymbol: silverSymbol,
      sourceUnit: "تومان/گرم",

      sourceDate:
        typeof silverOunce.date ===
        "string"
          ? silverOunce.date
          : null,

      sourceTime:
        typeof silverOunce.time ===
        "string"
          ? silverOunce.time
          : null,

      sourceTimeUnix:
        normalizeUnixTime(
          silverOunce.time_unix,
        ),

      rawPayload: {
        silverOunce,
        usd,
        usdPriceToman,
      },
    },
  ];
}