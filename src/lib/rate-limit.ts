/**
 * Sliding-window rate limiting for the public endpoints.
 *
 * Held in memory: this app runs as a single instance, so a shared store would
 * add a dependency for no benefit. Counters reset when the server restarts,
 * which is the right trade for protecting a one-shop calendar from a script.
 */

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
let lastSweep = Date.now();

/** Drops buckets nobody has touched, so the map cannot grow without bound. */
function sweep(windowMs: number) {
  if (Date.now() - lastSweep < 60_000) return;
  lastSweep = Date.now();
  const cutoff = Date.now() - windowMs;
  for (const [key, bucket] of buckets) {
    if (bucket.hits.every((t) => t < cutoff)) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  sweep(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((t) => t > cutoff);

  if (bucket.hits.length >= limit) {
    buckets.set(key, bucket);
    const oldest = bucket.hits[0];
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  bucket.hits.push(now);
  buckets.set(key, bucket);
  return { allowed: true, remaining: limit - bucket.hits.length, retryAfterSeconds: 0 };
}

/** Best-effort client address; behind a proxy the forwarded header is what counts. */
export function clientKey(request: Request, scope: string) {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || headers.get("x-real-ip") || "unknown";
  return `${scope}:${ip}`;
}

export function tooManyRequests(retryAfterSeconds: number, message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Retry-After": String(retryAfterSeconds),
    },
  });
}
