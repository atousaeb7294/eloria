import {
  timingSafeEqual,
} from "node:crypto";

import {
  NextRequest,
  NextResponse,
} from "next/server";

import { acquireCronLease, releaseCronLease } from "@/lib/cron-lease";
import { clearExpiredRateLimits } from "@/lib/security/rate-limit";

import {
  releaseExpiredCheckoutOrders,
} from "@/lib/expired-order-release";

export const dynamic =
  "force-dynamic";

export const revalidate = 0;

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

  return secret || null;
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
      .slice(prefix.length)
      .trim();

  return token || null;
}

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
      successful: false,

      code:
        "UNAUTHORIZED",

      message:
        "Valid bearer authorization is required.",
    },
    {
      status: 401,

      headers: {
        ...noStoreHeaders(),

        "WWW-Authenticate":
          "Bearer",
      },
    },
  );
}

function getBatchSize(
  request: NextRequest,
): number {
  const value =
    request.nextUrl.searchParams.get(
      "batchSize",
    );

  if (!value) {
    return 25;
  }

  const parsed =
    Number.parseInt(
      value,
      10,
    );

  if (
    !Number.isFinite(parsed)
  ) {
    return 25;
  }

  return Math.min(
    Math.max(
      parsed,
      1,
    ),
    100,
  );
}

/**
 * مسیر اختصاصی Cron برای آزادسازی موجودی سفارش‌هایی
 * که مهلت پرداخت آن‌ها پایان یافته است.
 *
 * Authorization: Bearer <CRON_SECRET>
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
        successful: false,

        code:
          "CRON_SECRET_NOT_CONFIGURED",

        message:
          "Server cron authentication is not configured.",
      },
      {
        status: 503,

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

  const lease = await acquireCronLease({ key: "expired-orders", leaseMs: 240000 });
  if (!lease.acquired) {
    return NextResponse.json({ successful: true, skipped: true, reason: "LEASE_HELD" }, { status: 202, headers: noStoreHeaders() });
  }

  try {
    const result =
      await releaseExpiredCheckoutOrders({
        batchSize:
          getBatchSize(
            request,
          ),
      });

    const clearedRateLimitBuckets = await clearExpiredRateLimits();

    return NextResponse.json(
      {
        successful: true,

        ...result,
        clearedRateLimitBuckets,
      },
      {
        status:
          result.errors.length > 0
            ? 207
            : 200,

        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "[Eloria Cron] Expired-order inventory release failed.",
      error,
    );

    return NextResponse.json(
      {
        successful: false,

        code:
          "EXPIRED_ORDER_RELEASE_FAILED",

        message:
          "Expired-order inventory release failed.",
      },
      {
        status: 503,

        headers:
          noStoreHeaders(),
      },
    );
  } finally {
    await releaseCronLease("expired-orders", lease.holder).catch(() => undefined);
  }
}