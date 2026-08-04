type Bucket = { count: number; resetAt: number };
type RateLimitInput = { key: string; limit: number; windowMs: number };
type RateLimitResult = { allowed: boolean; remaining: number; retryAfterSeconds: number };

declare global { var __eloriaRateLimitBuckets: Map<string, Bucket> | undefined; }
const buckets = globalThis.__eloriaRateLimitBuckets ?? new Map<string, Bucket>();
if (process.env.NODE_ENV !== "production") globalThis.__eloriaRateLimitBuckets = buckets;

export function consumeRateLimit({ key, limit, windowMs }: RateLimitInput): RateLimitResult {
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: Math.max(limit - 1, 0), retryAfterSeconds: Math.ceil(windowMs / 1000) };
  }
  current.count += 1;
  buckets.set(key, current);
  return {
    allowed: current.count <= limit,
    remaining: Math.max(limit - current.count, 0),
    retryAfterSeconds: Math.max(Math.ceil((current.resetAt - now) / 1000), 1),
  };
}

export function clearExpiredRateLimits() {
  const now = Date.now();
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
}
