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
 *
 * Deployment note: `rateLimitStore` (as well as the AQ/CPCB TTL caches in
 * `lib/airQuality.ts` and `lib/cpcb.ts`) is in-memory and scoped per Node/serverless
 * instance. For multi-instance or edge-scaled deployments with strict global quotas,
 * replace this backing store with a shared distributed store such as Redis / Upstash.
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

/**
 * Resolves the caller's IP address using platform-injected headers first.
 *
 * Trust assumption:
 * - On Vercel, `x-vercel-forwarded-for` is set by the platform edge and cannot be
 *   spoofed by clients, so it takes precedence over `x-forwarded-for`.
 * - Similarly, `cf-connecting-ip` (Cloudflare) and `x-real-ip` (trusted reverse proxy)
 *   are preferred before falling back to the generic `x-forwarded-for` header, whose
 *   leftmost hop can be spoofed when deployed behind an untrusted or misconfigured proxy.
 */
export function getClientIp(req: Request): string {
  const vercelIp = req.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercelIp) return vercelIp.slice(0, 64);

  const cfIp = req.headers.get("cf-connecting-ip")?.trim();
  if (cfIp) return cfIp.slice(0, 64);

  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 64);

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  return "unknown";
}

export function clearRateLimitStoreForTests(): void {
  rateLimitStore.clear();
}
