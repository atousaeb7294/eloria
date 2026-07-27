import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  syncMetalPrices,
} from "@/lib/metal-price-sync";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

export const runtime =
  "nodejs";

const MIN_REFRESH_INTERVAL_MS =
  15_000;

let lastSuccessfulRefreshAt =
  0;

let activeRefresh:
  Promise<unknown> | null =
  null;

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
  };
}

function isSameOrigin(
  request: NextRequest,
): boolean {
  const origin =
    request.headers.get(
      "origin",
    );

  if (!origin) {
    return true;
  }

  return (
    origin ===
    request.nextUrl.origin
  );
}

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
        successful: false,
        code:
          "FORBIDDEN_ORIGIN",
        message:
          "درخواست معتبر نیست.",
      },
      {
        status: 403,
        headers:
          noStoreHeaders(),
      },
    );
  }

  const now =
    Date.now();

  if (
    lastSuccessfulRefreshAt >
      0 &&
    now -
      lastSuccessfulRefreshAt <
      MIN_REFRESH_INTERVAL_MS
  ) {
    return NextResponse.json(
      {
        successful: true,
        refreshed: false,
        reused: true,

        refreshedAt:
          new Date(
            lastSuccessfulRefreshAt,
          ).toISOString(),
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      },
    );
  }

  try {
    if (!activeRefresh) {
      activeRefresh =
        syncMetalPrices()
          .then((result) => {
            lastSuccessfulRefreshAt =
              Date.now();

            return result;
          })
          .finally(() => {
            activeRefresh =
              null;
          });
    }

    await activeRefresh;

    return NextResponse.json(
      {
        successful: true,
        refreshed: true,
        reused: false,

        refreshedAt:
          new Date(
            lastSuccessfulRefreshAt,
          ).toISOString(),
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "[Eloria Cart] Live metal-price refresh failed.",
      error,
    );

    return NextResponse.json(
      {
        successful: false,
        code:
          "PRICE_REFRESH_FAILED",
        message:
          "به‌روزرسانی نرخ زنده در حال حاضر امکان‌پذیر نیست.",
      },
      {
        status: 503,
        headers:
          noStoreHeaders(),
      },
    );
  }
}