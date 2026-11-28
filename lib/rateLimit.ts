interface RateLimitEntry {
  timestamps: number[];
}

const DEFAULT_MAX_BUCKETS = 5000;
const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding-window in-memory rate limiter with bounded bucket storage.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): RateLimitResult {
  const cutoff = now - windowMs;

  if (rateLimitStore.size >= DEFAULT_MAX_BUCKETS) {
    for (const [k, entry] of rateLimitStore.entries()) {
      const active = entry.timestamps.filter((t) => t > cutoff);
      if (active.length === 0) {
        rateLimitStore.delete(k);
      } else {
        entry.timestamps = active;
      }
      if (rateLimitStore.size < DEFAULT_MAX_BUCKETS) break;
    }
    if (rateLimitStore.size >= DEFAULT_MAX_BUCKETS) {
      const oldestKey = rateLimitStore.keys().next().value;
      if (oldestKey) rateLimitStore.delete(oldestKey);
    }
  }

  const entry = rateLimitStore.get(key);
  const recent = entry ? entry.timestamps.filter((t) => t > cutoff) : [];

  if (recent.length >= limit) {
    const oldestInWindow = recent[0] ?? now;
    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((oldestInWindow + windowMs - now) / 1000)
    );
    rateLimitStore.set(key, { timestamps: recent });
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  rateLimitStore.set(key, { timestamps: recent });
  return {
    allowed: true,
    remaining: Math.max(0, limit - recent.length),
    retryAfterSeconds: 0,
  };
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);
  return "unknown";
}

export function clearRateLimitStoreForTests(): void {
  rateLimitStore.clear();
}
