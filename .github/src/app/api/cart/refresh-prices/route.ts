import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getMetalPriceSnapshot,
} from "@/lib/metal-prices";

import {
  consumeRateLimit,
} from "@/lib/security/rate-limit";

import {
  hasTrustedOrigin,
  requestIp,
} from "@/lib/security/request";

export const dynamic =
  "force-dynamic";

export const revalidate =
  0;

export const runtime =
  "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",

    Pragma:
      "no-cache",

    Expires:
      "0",
  };
}

function getLatestSuccessTimestamp(
  timestamps: string[],
): string {
  const validTimestamps =
    timestamps
      .map((timestamp) =>
        Date.parse(timestamp),
      )
      .filter(
        (timestamp) =>
          Number.isFinite(
            timestamp,
          ),
      );

  if (
    validTimestamps.length ===
    0
  ) {
    return new Date()
      .toISOString();
  }

  return new Date(
    Math.max(
      ...validTimestamps,
    ),
  ).toISOString();
}

/**
 * این Route سرویس خارجی نرخ طلا و نقره را فراخوانی نمی‌کند.
 *
 * فقط آخرین نرخ‌های ذخیره‌شده در دیتابیس و سیاست قیمت‌گذاری
 * هر فلز را بررسی می‌کند.
 *
 * همگام‌سازی واقعی نرخ‌ها فقط از Route امن Cron انجام می‌شود:
 *
 * GET /api/cron/metal-prices
 */
export async function POST(
  request: NextRequest,
) {
  if (
    !hasTrustedOrigin(
      request,
    )
  ) {
    return NextResponse.json(
      {
        successful:
          false,

        code:
          "FORBIDDEN_ORIGIN",

        message:
          "درخواست معتبر نیست.",
      },
      {
        status:
          403,

        headers:
          noStoreHeaders(),
      },
    );
  }

  const rate = consumeRateLimit({
    key: `metal-price-refresh:${requestIp(request)}`,
    limit: 20,
    windowMs: 60_000,
  });

  if (!rate.allowed) {
    return NextResponse.json(
      { successful: false, code: "RATE_LIMITED", message: "تعداد درخواست‌ها بیش از حد مجاز است." },
      { status: 429, headers: { ...noStoreHeaders(), "Retry-After": String(rate.retryAfterSeconds) } },
    );
  }

  try {
    const snapshot =
      await getMetalPriceSnapshot();

    if (
      snapshot.prices.length ===
      0
    ) {
      return NextResponse.json(
        {
          successful:
            false,

          code:
            "METAL_PRICES_NOT_AVAILABLE",

          message:
            "هنوز نرخ معتبری برای طلا یا نقره ثبت نشده است.",
        },
        {
          status:
            503,

          headers:
            noStoreHeaders(),
        },
      );
    }

    const refreshedAt =
      getLatestSuccessTimestamp(
        snapshot.prices.map(
          (price) =>
            price.lastSuccessAt,
        ),
      );

    /*
     * نرخ‌هایی که از نظر زمانی منقضی هستند،
     * حتی اگر طبق سیاست بازار بسته هنوز قابل فروش باشند.
     */
    const technicallyStaleMaterials =
      snapshot.prices
        .filter(
          (price) =>
            price.isStale,
        )
        .map(
          (price) =>
            price.material,
        );

    /*
     * نرخ‌هایی که در حالت بازار بسته و با حاشیه امنیت
     * قابل استفاده هستند.
     */
    const closedMarketMaterials =
      snapshot.prices
        .filter(
          (price) =>
            price.saleMode ===
            "CLOSED_MARKET",
        )
        .map(
          (price) =>
            price.material,
        );

    /*
     * فقط این نرخ‌ها باید خرید را متوقف کنند.
     */
    const unavailableMaterials =
      snapshot.prices
        .filter(
          (price) =>
            !price.isUsableForSale,
        )
        .map(
          (price) =>
            price.material,
        );

    const rateStates =
      snapshot.prices.map(
        (price) => ({
          material:
            price.material,

          saleMode:
            price.saleMode,

          saleReason:
            price.saleReason,

          isUsableForSale:
            price.isUsableForSale,

          isStale:
            price.isStale,

          freshnessReason:
            price.freshnessReason,

          ageSeconds:
            price.ageSeconds,

          originalPricePerGramToman:
            price.pricePerGramToman,

          effectivePricePerGramToman:
            price.effectivePricePerGramToman,

          appliedSafetyMarginPercent:
            price.appliedSafetyMarginPercent,

          safetyMarginAmountToman:
            price.safetyMarginAmountToman,

          staleAfterMinutes:
            price.staleAfterMinutes,

          closedMarketMaxAgeMinutes:
            price.closedMarketMaxAgeMinutes,
        }),
      );

    return NextResponse.json(
      {
        successful:
          true,

        refreshed:
          false,

        reused:
          true,

        refreshedAt,

        checkedAt:
          new Date()
            .toISOString(),

        staleAfterMinutes:
          snapshot.staleAfterMinutes,

        /*
         * وضعیت جدید و دقیق
         */
        hasUnavailableRates:
          unavailableMaterials.length >
          0,

        unavailableMaterials,

        hasClosedMarketRates:
          closedMarketMaterials.length >
          0,

        closedMarketMaterials,

        technicallyStaleMaterials,

        rateStates,

        /*
         * سازگاری موقت با نسخه فعلی کامپوننت سبد خرید:
         * نرخ بازار بسته نباید به‌عنوان خطا گزارش شود.
         */
        hasStaleRates:
          unavailableMaterials.length >
          0,

        staleMaterials:
          unavailableMaterials,
      },
      {
        status:
          200,

        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "[Eloria Cart] Unable to read stored metal prices.",
      error,
    );

    return NextResponse.json(
      {
        successful:
          false,

        code:
          "PRICE_REFRESH_FAILED",

        message:
          "بررسی نرخ‌های ذخیره‌شده در حال حاضر امکان‌پذیر نیست.",
      },
      {
        status:
          503,

        headers:
          noStoreHeaders(),
      },
    );
  }
}