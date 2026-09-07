const TROY_OUNCE_GRAMS =
  31.1034768;

const REQUEST_TIMEOUT_MS =
  15_000;

const UNIX_MILLISECONDS_THRESHOLD =
  100_000_000_000;

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

export type RequiredSourceTimestamp = {
  sourceDate: string | null;
  sourceTime: string | null;
  sourceTimeUnix: number | null;
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
  const url =
    new URL(baseUrl);

  url.searchParams.set(
    "key",
    getRequiredApiKey(),
  );

  for (
    const [key, value] of
    Object.entries(parameters)
  ) {
    url.searchParams.set(
      key,
      value,
    );
  }

  return url;
}

async function fetchJson(
  url: URL,
  label: string,
) {
  const controller =
    new AbortController();

  const timeout =
    setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);

  try {
    const response =
      await fetch(url, {
        method:
          "GET",

        headers: {
          Accept:
            "application/json",
        },

        cache:
          "no-store",

        signal:
          controller.signal,
      });

    const responseText =
      await response.text();

    if (!response.ok) {
      throw new Error(
        `${label}: خطای HTTP ${response.status}`,
      );
    }

    try {
      return JSON.parse(
        responseText,
      );
    } catch {
      throw new Error(
        `${label}: پاسخ API معتبر نیست.`,
      );
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.name ===
        "AbortError"
    ) {
      throw new Error(
        `${label}: زمان دریافت پاسخ بیشتر از ۱۵ ثانیه شد.`,
      );
    }

    throw error;
  } finally {
    clearTimeout(
      timeout,
    );
  }
}

function convertIranianPriceToToman(
  price: unknown,
  unit: unknown,
) {
  const numericPrice =
    Number(price);

  if (
    !Number.isFinite(
      numericPrice,
    ) ||
    numericPrice <= 0
  ) {
    throw new Error(
      "قیمت دریافت‌شده از API معتبر نیست.",
    );
  }

  const normalizedUnit =
    String(
      unit ?? "",
    )
      .trim()
      .replace(
        /\s+/g,
        "",
      );

  if (
    normalizedUnit.includes(
      "تومان",
    )
  ) {
    return numericPrice;
  }

  if (
    normalizedUnit.includes(
      "ریال",
    )
  ) {
    return (
      numericPrice /
      10
    );
  }

  throw new Error(
    `واحد پول ناشناخته است: ${String(unit)}`,
  );
}

function normalizeUnixTime(
  value: unknown,
): number | null {
  const numericValue =
    Number(value);

  return (
    Number.isInteger(
      numericValue,
    ) &&
    numericValue > 0
  )
    ? numericValue
    : null;
}

function unixTimeToMilliseconds(
  value: number,
): number {
  if (
    value >=
    UNIX_MILLISECONDS_THRESHOLD
  ) {
    return value;
  }

  return (
    value *
    1000
  );
}

function getOptionalString(
  value: unknown,
): string | null {
  return typeof value ===
    "string"
    ? value
    : null;
}

/**
 * نرخ ترکیبی فقط به اندازه قدیمی‌ترین
 * ورودی موردنیاز خود تازه است.
 *
 * نرخ نقره از قیمت جهانی نقره و نرخ دلار
 * ساخته می‌شود؛ پس timestamp نهایی باید
 * قدیمی‌ترین timestamp این دو ورودی باشد.
 */
export function getOldestRequiredSourceTimestamp(
  firstSource: Record<
    string,
    unknown
  >,

  secondSource: Record<
    string,
    unknown
  >,
): RequiredSourceTimestamp {
  const firstSourceTimeUnix =
    normalizeUnixTime(
      firstSource.time_unix,
    );

  const secondSourceTimeUnix =
    normalizeUnixTime(
      secondSource.time_unix,
    );

  if (
    firstSourceTimeUnix ===
      null ||
    secondSourceTimeUnix ===
      null
  ) {
    return {
      sourceDate:
        null,

      sourceTime:
        null,

      sourceTimeUnix:
        null,
    };
  }

  const firstTimestampMilliseconds =
    unixTimeToMilliseconds(
      firstSourceTimeUnix,
    );

  const secondTimestampMilliseconds =
    unixTimeToMilliseconds(
      secondSourceTimeUnix,
    );

  const useFirstSource =
    firstTimestampMilliseconds <=
    secondTimestampMilliseconds;

  const selectedSource =
    useFirstSource
      ? firstSource
      : secondSource;

  return {
    sourceDate:
      getOptionalString(
        selectedSource.date,
      ),

    sourceTime:
      getOptionalString(
        selectedSource.time,
      ),

    sourceTimeUnix:
      useFirstSource
        ? firstSourceTimeUnix
        : secondSourceTimeUnix,
  };
}

function productionProviderUrl(
  environmentKey: "BRS_GOLD_API_URL" | "BRS_COMMODITY_API_URL",
  fallback: string,
): string {
  const selected = process.env[environmentKey]?.trim() || fallback;
  const url = new URL(selected);

  if (url.protocol !== "https:") {
    throw new Error(`${environmentKey}: فقط HTTPS مجاز است.`);
  }

  if (
    process.env.NODE_ENV === "production" &&
    url.hostname.toLowerCase() !== "api.brsapi.ir"
  ) {
    throw new Error(`${environmentKey}: در Production فقط Api.BrsApi.ir مجاز است.`);
  }

  return url.toString();
}

export async function fetchBrsMetalRates(): Promise<
  FetchedMetalRate[]
> {
  const goldApiUrl =
    productionProviderUrl(
      "BRS_GOLD_API_URL",
      "https://Api.BrsApi.ir/Market/Gold_Currency_Pro.php",
    );

  const commodityApiUrl =
    productionProviderUrl(
      "BRS_COMMODITY_API_URL",
      "https://Api.BrsApi.ir/Market/Commodity.php",
    );

  const goldSymbol =
    process.env
      .BRS_GOLD_SYMBOL
      ?.trim() ||
    "IR_GOLD_18K";

  const usdSymbol =
    process.env
      .BRS_USD_SYMBOL
      ?.trim() ||
    "USD";

  const silverSymbol =
    process.env
      .BRS_SILVER_SYMBOL
      ?.trim() ||
    "XAGUSD";

  const marketUrl =
    buildApiUrl(
      goldApiUrl,
      {
        section:
          "gold,currency",
      },
    );

  const marketResponse =
    await fetchJson(
      marketUrl,
      "API طلا و ارز",
    );

  if (
    marketResponse
      ?.successful ===
    false
  ) {
    throw new Error(
      marketResponse
        .message_error ||
        "API طلا پاسخ ناموفق برگرداند.",
    );
  }

  const goldItems =
    marketResponse
      ?.gold
      ?.type;

  if (
    !Array.isArray(
      goldItems,
    )
  ) {
    throw new Error(
      "فهرست نرخ‌های طلا در پاسخ API پیدا نشد.",
    );
  }

  const gold18 =
    goldItems.find(
      (
        item: Record<
          string,
          unknown
        >,
      ) =>
        item.symbol ===
        goldSymbol,
    );

  if (!gold18) {
    throw new Error(
      `نماد ${goldSymbol} در پاسخ طلا پیدا نشد.`,
    );
  }

  const goldPricePerGramToman =
    Math.round(
      convertIranianPriceToToman(
        gold18.price,
        gold18.unit,
      ),
    );

  const rates: FetchedMetalRate[] = [
    {
      material:
        "GOLD",

      pricePerGramToman:
        goldPricePerGramToman,

      referencePurity:
        750,

      source:
        "BRS_API",

      sourceSymbol:
        goldSymbol,

      sourceUnit:
        String(
          gold18.unit ??
            "تومان",
        ),

      sourceDate:
        getOptionalString(
          gold18.date,
        ),

      sourceTime:
        getOptionalString(
          gold18.time,
        ),

      sourceTimeUnix:
        normalizeUnixTime(
          gold18.time_unix,
        ),

      rawPayload: {
        gold:
          gold18,
      },
    },
  ];

  /**
   * خرابی یا محدودیت API کامودیتی نباید Sync طلا را متوقف کند.
   * در این حالت نرخ قبلی نقره در دیتابیس حفظ می‌شود و سیاست
   * بازار بسته درباره قابل‌فروش‌بودن آن تصمیم می‌گیرد.
   */
  let commodityResponse: Record<string, unknown> | null = null;

  try {
    const commodityUrl =
      buildApiUrl(
        commodityApiUrl,
      );

    commodityResponse =
      await fetchJson(
        commodityUrl,
        "API نقره",
      );
  } catch (error) {
    console.warn(
      `هشدار: Sync نقره انجام نشد و نرخ قبلی حفظ شد. ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );

    return rates;
  }

  try {
    const currencyItems =
      marketResponse
        ?.currency
        ?.free;

    if (
      !Array.isArray(
        currencyItems,
      )
    ) {
      throw new Error(
        "فهرست نرخ ارز در پاسخ API پیدا نشد.",
      );
    }

    const usd =
      currencyItems.find(
        (
          item: Record<
            string,
            unknown
          >,
        ) =>
          item.symbol ===
          usdSymbol,
      );

    if (!usd) {
      throw new Error(
        `نماد ${usdSymbol} در پاسخ ارز پیدا نشد.`,
      );
    }

    const preciousMetals =
      commodityResponse
        ?.metal_precious;

    if (
      !Array.isArray(
        preciousMetals,
      )
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

    const usdPriceToman =
      convertIranianPriceToToman(
        usd.price,
        usd.unit,
      );

    const silverOunceUsd =
      Number(
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
        (
          silverOunceUsd *
          usdPriceToman
        ) /
          TROY_OUNCE_GRAMS,
      );

    const silverRateTimestamp =
      getOldestRequiredSourceTimestamp(
        silverOunce,
        usd,
      );

    rates.push({
      material:
        "SILVER",

      pricePerGramToman:
        silverPricePerGramToman,

      referencePurity:
        999,

      source:
        "BRS_API",

      sourceSymbol:
        silverSymbol,

      sourceUnit:
        "تومان/گرم",

      sourceDate:
        silverRateTimestamp
          .sourceDate,

      sourceTime:
        silverRateTimestamp
          .sourceTime,

      sourceTimeUnix:
        silverRateTimestamp
          .sourceTimeUnix,

      rawPayload: {
        silverOunce,

        usd,

        usdPriceToman,

        timestampPolicy:
          "OLDEST_REQUIRED_SOURCE",

        selectedSourceTimeUnix:
          silverRateTimestamp
            .sourceTimeUnix,
      },
    });
  } catch (error) {
    console.warn(
      `هشدار: پاسخ نقره قابل استفاده نبود و نرخ قبلی حفظ شد. ${
        error instanceof Error
          ? error.message
          : String(error)
      }`,
    );
  }

  return rates;
}
