import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { acquireCronLease, releaseCronLease } from "@/lib/cron-lease";

import {
  syncMetalPrices,
} from "@/lib/metal-price-sync";

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

function getConfiguredSecret():
  string | null {
  const secret =
    process.env
      .CRON_SECRET
      ?.trim();

  return secret ||
    null;
}

function getBearerToken(
  request: NextRequest,
): string | null {
  const authorization =
    request.headers.get(
      "authorization",
    );

  if (!authorization) {
    return null;
  }

  const prefix =
    "Bearer ";

  if (
    !authorization.startsWith(
      prefix,
    )
  ) {
    return null;
  }

  const token =
    authorization
      .slice(
        prefix.length,
      )
      .trim();

  return token ||
    null;
}

/**
 * رمزها با timingSafeEqual مقایسه می‌شوند
 * تا مقایسه مستقیم رشته‌ای انجام نشود.
 */
function secretsMatch(
  providedSecret: string,
  configuredSecret: string,
): boolean {
  const providedBuffer =
    Buffer.from(
      providedSecret,
      "utf8",
    );

  const configuredBuffer =
    Buffer.from(
      configuredSecret,
      "utf8",
    );

  if (
    providedBuffer.length !==
    configuredBuffer.length
  ) {
    return false;
  }

  return timingSafeEqual(
    providedBuffer,
    configuredBuffer,
  );
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      successful:
        false,

      code:
        "UNAUTHORIZED",

      message:
        "Valid bearer authorization is required.",
    },
    {
      status:
        401,

      headers: {
        ...noStoreHeaders(),

        "WWW-Authenticate":
          "Bearer",
      },
    },
  );
}

/**
 * Route اختصاصی Cron:
 *
 * Authorization: Bearer <CRON_SECRET>
 *
 * این Route نباید از مرورگر مشتری فراخوانی شود.
 */
export async function GET(
  request: NextRequest,
) {
  const configuredSecret =
    getConfiguredSecret();

  if (!configuredSecret) {
    console.error(
      "[Eloria Cron] CRON_SECRET is not configured.",
    );

    return NextResponse.json(
      {
        successful:
          false,

        code:
          "CRON_SECRET_NOT_CONFIGURED",

        message:
          "Server cron authentication is not configured.",
      },
      {
        status:
          503,

        headers:
          noStoreHeaders(),
      },
    );
  }

  const providedSecret =
    getBearerToken(
      request,
    );

  if (
    !providedSecret ||
    !secretsMatch(
      providedSecret,
      configuredSecret,
    )
  ) {
    return unauthorizedResponse();
  }

  const lease = await acquireCronLease({ key: "metal-prices", leaseMs: 540000 });
  if (!lease.acquired) {
    return NextResponse.json({ successful: true, skipped: true, reason: "LEASE_HELD" }, { status: 202, headers: noStoreHeaders() });
  }

  try {
    const syncedRates =
      await syncMetalPrices();

    const syncedAt =
      new Date()
        .toISOString();

    return NextResponse.json(
      {
        successful:
          true,

        syncedAt,

        rateCount:
          syncedRates.length,

        rates:
          syncedRates.map(
            (rate) => ({
              material:
                rate.material,

              sourceSymbol:
                rate.sourceSymbol,

              sourceTimeUnix:
                rate.sourceTimeUnix,

              appliedToCurrent:
                rate.appliedToCurrent,

              writeReason:
                rate.writeReason,
            }),
          ),
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
      "[Eloria Cron] Metal-price synchronization failed.",
      error,
    );

    return NextResponse.json(
      {
        successful:
          false,

        code:
          "METAL_PRICE_SYNC_FAILED",

        message:
          "Metal-price synchronization failed.",
      },
      {
        status:
          503,

        headers:
          noStoreHeaders(),
      },
    );
  } finally {
    await releaseCronLease("metal-prices", lease.holder).catch(() => undefined);
  }
}