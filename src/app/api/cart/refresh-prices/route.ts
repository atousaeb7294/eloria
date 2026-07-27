import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getMetalPriceSnapshot,
} from "@/lib/metal-prices";

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

function isSameOrigin(
  request: NextRequest,
): boolean {
  const origin =
    request.headers.get(
      "origin",
    );

  /**
   * بعضی درخواست‌های داخلی یا ابزارهای سرور
   * ممکن است Origin نداشته باشند.
   */
  if (!origin) {
    return true;
  }

  return (
    origin ===
    request.nextUrl.origin
  );
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
 * این Route دیگر مستقیماً سرویس خارجی
 * طلا و نقره را فراخوانی نمی‌کند.
 *
 * وظیفه آن فقط بررسی آخرین نرخ‌های ذخیره‌شده
 * در دیتابیس است.
 *
 * همگام‌سازی واقعی از Route امن کرون انجام می‌شود:
 *
 * GET /api/cron/metal-prices
 */
export async function POST(
  request: NextRequest,
) {
  if (
    !isSameOrigin(
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
            "هنوز نرخ معتبری برای طلا و نقره ثبت نشده است.",
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

    const staleMaterials =
      snapshot.prices
        .filter(
          (price) =>
            price.isStale,
        )
        .map(
          (price) =>
            price.material,
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

        hasStaleRates:
          staleMaterials.length >
          0,

        staleMaterials,
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