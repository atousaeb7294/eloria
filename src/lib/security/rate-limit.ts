import { createHash } from "node:crypto";
import { prisma } from "@/lib/prisma";

type Bucket = { count: number; resetAt: number };
export type RateLimitInput = { key: string; limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

declare global {
  var __eloriaRateLimitFallback: Map<string, Bucket> | undefined;
  var __eloriaRateLimitSharedUnavailableUntil: number | undefined;
}

const fallback = globalThis.__eloriaRateLimitFallback ?? new Map<string, Bucket>();
globalThis.__eloriaRateLimitFallback = fallback;

const SHARED_LIMITER_COOLDOWN_MS = 30_000;

type FailureMode = "closed" | "fallback";

function failureMode(): FailureMode {
  if (process.env.NODE_ENV !== "production") return "fallback";
  return process.env.ELORIA_RATE_LIMIT_FAILURE_MODE?.trim().toLowerCase() === "fallback"
    ? "fallback"
    : "closed";
}

function sharedLimiterCoolingDown(): boolean {
  return (globalThis.__eloriaRateLimitSharedUnavailableUntil ?? 0) > Date.now();
}

function hashedKey(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function consumeFallback(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const current = fallback.get(key);

  if (!current || current.resetAt <= now) {
    fallback.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(limit - 1, 0),
      retryAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  current.count += 1;
  fallback.set(key, current);

  return {
    allowed: current.count <= limit,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}

function denyWhileSharedLimiterUnavailable(windowMs: number): RateLimitResult {
  return {
    allowed: false,
    remaining: 0,
    retryAfterSeconds: Math.max(
      Math.ceil(Math.min(windowMs, SHARED_LIMITER_COOLDOWN_MS) / 1000),
      1,
    ),
  };
}

export async function consumeRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitInput): Promise<RateLimitResult> {
  const safeLimit = Math.max(1, Math.trunc(limit));
  const safeWindow = Math.max(1_000, Math.trunc(windowMs));
  const bucketKey = hashedKey(key).slice(0, 190);
  const mode = failureMode();

  if (process.env.NODE_ENV !== "production") {
    return consumeFallback(bucketKey, safeLimit, safeWindow);
  }

  if (sharedLimiterCoolingDown()) {
    return mode === "fallback"
      ? consumeFallback(bucketKey, safeLimit, safeWindow)
      : denyWhileSharedLimiterUnavailable(safeWindow);
  }

  const now = new Date();
  const resetAt = new Date(now.getTime() + safeWindow);

  try {
    const rows = await prisma.$queryRaw<Array<{ count: number; resetAt: Date }>>`
      INSERT INTO rate_limit_buckets (key, count, "resetAt", "createdAt", "updatedAt")
      VALUES (${bucketKey}, 1, ${resetAt}, NOW(), NOW())
      ON CONFLICT (key) DO UPDATE SET
        count = CASE
          WHEN rate_limit_buckets."resetAt" <= ${now} THEN 1
          ELSE rate_limit_buckets.count + 1
        END,
        "resetAt" = CASE
          WHEN rate_limit_buckets."resetAt" <= ${now} THEN ${resetAt}
          ELSE rate_limit_buckets."resetAt"
        END,
        "updatedAt" = NOW()
      RETURNING count, "resetAt" AS "resetAt"
    `;

    const row = rows[0];
    if (!row) throw new Error("RATE_LIMIT_ROW_MISSING");

    return {
      allowed: row.count <= safeLimit,
      remaining: Math.max(safeLimit - row.count, 0),
      retryAfterSeconds: Math.max(
        Math.ceil((new Date(row.resetAt).getTime() - now.getTime()) / 1000),
        1,
      ),
    };
  } catch (error) {
    globalThis.__eloriaRateLimitSharedUnavailableUntil =
      Date.now() + SHARED_LIMITER_COOLDOWN_MS;

    console.error(
      `[Eloria Rate Limit] Shared limiter unavailable; failure mode is ${mode}.`,
      error,
    );

    return mode === "fallback"
      ? consumeFallback(bucketKey, safeLimit, safeWindow)
      : denyWhileSharedLimiterUnavailable(safeWindow);
  }
}

export async function clearExpiredRateLimits(): Promise<number> {
  try {
    const deleted = await prisma.rateLimitBucket.deleteMany({
      where: { resetAt: { lte: new Date() } },
    });
    return deleted.count;
  } catch {
    const now = Date.now();
    let deleted = 0;
    for (const [key, bucket] of fallback) {
      if (bucket.resetAt <= now) {
        fallback.delete(key);
        deleted += 1;
      }
    }
    return deleted;
  }
}
