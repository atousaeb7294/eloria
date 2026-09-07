import {
  timingSafeEqual,
} from "node:crypto";
import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  acquireCronLease,
  releaseCronLease,
} from "@/lib/cron-lease";
import {
  runDataRetention,
} from "@/lib/data-retention";

export const dynamic =
  "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function noStoreHeaders() {
  return {
    "Cache-Control":
      "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

function safeEqual(
  left: string,
  right: string,
): boolean {
  const a =
    Buffer.from(
      left,
      "utf8",
    );
  const b =
    Buffer.from(
      right,
      "utf8",
    );

  return (
    a.length === b.length &&
    timingSafeEqual(a, b)
  );
}

function authorized(
  request: NextRequest,
): boolean {
  const configured =
    process.env
      .CRON_SECRET
      ?.trim() ?? "";

  if (
    configured.length < 48
  ) {
    return false;
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  if (
    !authorization?.startsWith(
      "Bearer ",
    )
  ) {
    return false;
  }

  const supplied =
    authorization
      .slice(7)
      .trim();

  return (
    supplied.length > 0 &&
    safeEqual(
      supplied,
      configured,
    )
  );
}

export async function GET(
  request: NextRequest,
) {
  if (!authorized(request)) {
    return NextResponse.json(
      {
        successful: false,
        code: "UNAUTHORIZED",
      },
      {
        status: 401,
        headers:
          noStoreHeaders(),
      },
    );
  }

  const lease =
    await acquireCronLease({
      key: "data-retention",
      leaseMs: 10 * 60_000,
    });

  if (!lease.acquired) {
    return NextResponse.json(
      {
        successful: true,
        skipped: true,
        reason: "LEASE_HELD",
      },
      {
        status: 202,
        headers:
          noStoreHeaders(),
      },
    );
  }

  try {
    const result =
      await runDataRetention();

    return NextResponse.json(
      {
        successful: true,
        ...result,
      },
      {
        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error(
      "[Eloria Cron] Data-retention job failed.",
      error,
    );

    return NextResponse.json(
      {
        successful: false,
        code:
          "DATA_RETENTION_FAILED",
      },
      {
        status: 503,
        headers:
          noStoreHeaders(),
      },
    );
  } finally {
    await releaseCronLease(
      "data-retention",
      lease.holder,
    ).catch(
      () => undefined,
    );
  }
}
