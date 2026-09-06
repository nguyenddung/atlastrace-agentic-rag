/**
 * In-memory fixed-window rate limiter for the public research API.
 *
 * Best-effort by design: state lives in module scope, so it resets on every
 * cold start and is not shared across serverless instances. That is enough to
 * blunt casual abuse and accidental request loops against the live demo. A
 * deployment taking real production traffic should move this to a durable,
 * shared store (Vercel KV, Upstash) behind the same checkRateLimit interface.
 */

export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_MAX_REQUESTS = 20;

const SWEEP_THRESHOLD = 5_000;

type Bucket = { count: number; windowStart: number };

const buckets = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; retryAfterMs: number };

function sweep(now: number) {
  if (buckets.size < SWEEP_THRESHOLD) return;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) buckets.delete(key);
  }
}

export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  sweep(now);
  const bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    buckets.set(key, { count: 1, windowStart: now });
    return { allowed: true, retryAfterMs: 0 };
  }

  if (bucket.count < RATE_LIMIT_MAX_REQUESTS) {
    bucket.count += 1;
    return { allowed: true, retryAfterMs: 0 };
  }

  return { allowed: false, retryAfterMs: RATE_LIMIT_WINDOW_MS - (now - bucket.windowStart) };
}
