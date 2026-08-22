import { Prisma } from "@/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

import {
  isSiteMeasurementEnabled,
  normalizeSiteMeasurementEvent,
} from "@/lib/site-measurement";
import { prisma } from "@/lib/prisma";
import { JsonRequestBodyError, readJsonBody } from "@/lib/security/json-body";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestIp } from "@/lib/security/request";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

function headers(): HeadersInit {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate",
    Pragma: "no-cache",
  };
}

export async function POST(request: NextRequest) {
  if (!isSiteMeasurementEnabled()) {
    return new NextResponse(null, { status: 204, headers: headers() });
  }

  if (!hasTrustedOrigin(request)) {
    return new NextResponse(null, { status: 403, headers: headers() });
  }

  const rate = await consumeRateLimit({
    key: `site-measurement:${requestIp(request)}`,
    limit: 240,
    windowMs: 10 * 60_000,
  });
  if (!rate.allowed) {
    return new NextResponse(null, {
      status: 429,
      headers: { ...headers(), "Retry-After": String(rate.retryAfterSeconds) },
    });
  }

  let raw: unknown;
  try {
    raw = await readJsonBody(request, 8 * 1024);
  } catch (error) {
    const status = error instanceof JsonRequestBodyError ? error.status : 400;
    return new NextResponse(null, { status, headers: headers() });
  }

  const event = normalizeSiteMeasurementEvent(raw);
  if (!event) return new NextResponse(null, { status: 400, headers: headers() });

  try {
    await prisma.siteMeasurementEvent.create({
      data: {
        eventKey: event.eventKey,
        eventType: event.eventType,
        locale: event.locale,
        path: event.path,
        sessionId: event.sessionId,
        productSlug: event.productSlug,
        metricName: event.metricName,
        metricValue: event.metricValue === null ? null : new Prisma.Decimal(event.metricValue),
        metricRating: event.metricRating,
        navigationType: event.navigationType,
        occurredAt: event.occurredAt,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return new NextResponse(null, { status: 204, headers: headers() });
    }
    console.error("[eloria measurement] event write failed", error);
    return new NextResponse(null, { status: 503, headers: headers() });
  }

  return new NextResponse(null, { status: 204, headers: headers() });
}
