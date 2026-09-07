const TROY_OUNCE_GRAMS = 31.1034768;
const REQUEST_TIMEOUT_MS = 15000;

const config = {
  apiKey: process.env.BRS_API_KEY?.trim(),

  goldApiUrl:
    process.env.BRS_GOLD_API_URL?.trim() ||
    "https://Api.BrsApi.ir/Market/Gold_Currency_Pro.php",

  commodityApiUrl:
    process.env.BRS_COMMODITY_API_URL?.trim() ||
    "https://Api.BrsApi.ir/Market/Commodity.php",

  goldSymbol:
    process.env.BRS_GOLD_SYMBOL?.trim() ||
    "IR_GOLD_18K",

  usdSymbol:
    process.env.BRS_USD_SYMBOL?.trim() ||
    "USD",

  silverSymbol:
    process.env.BRS_SILVER_SYMBOL?.trim() ||
    "XAGUSD",
};

if (!config.apiKey) {
  throw new Error(
    "متغیر BRS_API_KEY در فایل .env تنظیم نشده است.",
  );
}

function buildApiUrl(baseUrl, parameters = {}) {
  const url = new URL(baseUrl);

  url.searchParams.set(
    "key",
    config.apiKey,
  );

  for (const [key, value] of Object.entries(
    parameters,
  )) {
    url.searchParams.set(key, value);
  }

  return url;
}

async function fetchJson(url, label) {
  const controller = new AbortController();

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
        `${label}: پاسخ API فرمت JSON معتبر ندارد.`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        `${label}: زمان پاسخ‌گویی API بیشتر از ۱۵ ثانیه شد.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function convertIranianCurrencyToToman(
  price,
  unit,
) {
  const numericPrice = Number(price);

  if (!Number.isFinite(numericPrice)) {
    throw new Error(
      "قیمت دریافتی از API عدد معتبر نیست.",
    );
  }

  const normalizedUnit = String(
    unit || "",
  )
    .trim()
    .replace(/\s+/g, "");

  if (normalizedUnit.includes("تومان")) {
    return numericPrice;
  }

  if (normalizedUnit.includes("ریال")) {
    return numericPrice / 10;
  }

  throw new Error(
    `واحد پول ناشناخته است: ${unit}`,
  );
}

const goldMarketUrl = buildApiUrl(
  config.goldApiUrl,
  {
    section: "gold,currency",
  },
);

const commodityUrl = buildApiUrl(
  config.commodityApiUrl,
);

const [marketResponse, commodityResponse] =
  await Promise.all([
    fetchJson(
      goldMarketUrl,
      "API طلا و ارز",
    ),

    fetchJson(
      commodityUrl,
      "API کامودیتی",
    ),
  ]);

if (marketResponse?.successful === false) {
  throw new Error(
    marketResponse.message_error ||
      "API طلا پاسخ ناموفق برگرداند.",
  );
}

const goldItems =
  marketResponse?.gold?.type;

if (!Array.isArray(goldItems)) {
  throw new Error(
    "آرایه gold.type در پاسخ API پیدا نشد.",
  );
}

const gold18 = goldItems.find(
  (item) =>
    item?.symbol === config.goldSymbol,
);

if (!gold18) {
  throw new Error(
    `نماد ${config.goldSymbol} در پاسخ API پیدا نشد.`,
  );
}

const currencyItems =
  marketResponse?.currency?.free;

if (!Array.isArray(currencyItems)) {
  throw new Error(
    "آرایه currency.free در پاسخ API پیدا نشد.",
  );
}

const usd = currencyItems.find(
  (item) =>
    item?.symbol === config.usdSymbol,
);

if (!usd) {
  throw new Error(
    `نماد ${config.usdSymbol} در پاسخ API پیدا نشد.`,
  );
}

const preciousMetals =
  commodityResponse?.metal_precious;

if (!Array.isArray(preciousMetals)) {
  throw new Error(
    "آرایه metal_precious در پاسخ API کامودیتی پیدا نشد.",
  );
}

const silverOunce = preciousMetals.find(
  (item) =>
    item?.symbol ===
    config.silverSymbol,
);

if (!silverOunce) {
  throw new Error(
    `نماد ${config.silverSymbol} در پاسخ API پیدا نشد.`,
  );
}

const goldPricePerGramToman =
  convertIranianCurrencyToToman(
    gold18.price,
    gold18.unit,
  );

const usdPriceToman =
  convertIranianCurrencyToToman(
    usd.price,
    usd.unit,
  );

const silverOunceUsd = Number(
  silverOunce.price,
);

if (!Number.isFinite(silverOunceUsd)) {
  throw new Error(
    "نرخ انس نقره عدد معتبر نیست.",
  );
}

const silver999PerGramToman =
  Math.round(
    (silverOunceUsd * usdPriceToman) /
      TROY_OUNCE_GRAMS,
  );

const result = {
  successful: true,

  gold18: {
    symbol: gold18.symbol,
    name: gold18.name,
    pricePerGramToman:
      goldPricePerGramToman,
    sourceUnit: gold18.unit,
    date: gold18.date,
    time: gold18.time,
    timeUnix: gold18.time_unix,
  },

  usd: {
    symbol: usd.symbol,
    priceToman: usdPriceToman,
    sourcePrice: usd.price,
    sourceUnit: usd.unit,
    date: usd.date,
    time: usd.time,
    timeUnix: usd.time_unix,
  },

  silver999: {
    symbol: silverOunce.symbol,
    ouncePriceUsd: silverOunceUsd,
    pricePerGramToman:
      silver999PerGramToman,
    purity: 999,
    date: silverOunce.date,
    time: silverOunce.time,
    timeUnix: silverOunce.time_unix,
  },
};

console.log(
  JSON.stringify(result, null, 2),
);