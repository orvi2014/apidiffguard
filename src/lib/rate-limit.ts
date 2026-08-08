/**
 * Rate limiting for serverless routes.
 *
 * Uses Upstash Redis when `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
 * are set, so the limit is shared across every instance. Falls back to a
 * per-instance in-memory window otherwise — that fallback is best-effort only
 * (the effective limit multiplies by the number of warm instances), so it is a
 * burst guard rather than a real quota.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Cap the in-memory map so a long-lived instance can't leak unboundedly. */
const MAX_BUCKETS = 10_000;
let lastSweep = 0;

function sweep(now: number) {
  // Amortised cleanup: at most once every 60s, plus a hard cap.
  if (now - lastSweep < 60_000 && buckets.size < MAX_BUCKETS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  if (buckets.size >= MAX_BUCKETS) {
    // Still oversized after expiry sweep — drop the oldest entries.
    const sorted = [...buckets.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt
    );
    for (const [key] of sorted.slice(0, Math.ceil(sorted.length / 2))) {
      buckets.delete(key);
    }
  }
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

function memoryLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }
  existing.count += 1;
  return { ok: true };
}

function upstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

/**
 * Fixed-window counter in Redis: INCR the window key, set its TTL on first use.
 * One round-trip via the pipeline endpoint.
 */
async function redisLimit(
  cfg: { url: string; token: string },
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const windowStart = Math.floor(Date.now() / windowMs);
  const redisKey = `rl:${key}:${windowStart}`;

  try {
    const res = await fetch(`${cfg.url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSec), "NX"],
      ]),
      cache: "no-store",
      signal: AbortSignal.timeout(1_500),
    });

    if (!res.ok) return null;
    const parsed = (await res.json()) as Array<{ result?: unknown }>;
    const count = Number(parsed?.[0]?.result);
    if (!Number.isFinite(count)) return null;

    if (count > limit) {
      const elapsedMs = Date.now() - windowStart * windowMs;
      return {
        ok: false,
        retryAfterSec: Math.max(1, Math.ceil((windowMs - elapsedMs) / 1000)),
      };
    }
    return { ok: true };
  } catch {
    // Network/timeout — fail open to the in-memory limiter rather than
    // rejecting legitimate traffic because Redis blipped.
    return null;
  }
}

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const cfg = upstashConfig();
  if (cfg) {
    const result = await redisLimit(cfg, key, limit, windowMs);
    if (result) return result;
  }
  return memoryLimit(key, limit, windowMs);
}

/**
 * `x-forwarded-for` is only meaningful when the app sits behind a proxy that
 * overwrites it. On Vercel that is always true; anywhere else the header is
 * attacker-controlled and using it lets a caller mint unlimited buckets.
 * Opt in explicitly with `TRUST_PROXY_HEADERS=1`.
 */
function trustsProxyHeaders(): boolean {
  if (process.env.TRUST_PROXY_HEADERS === "1") return true;
  if (process.env.TRUST_PROXY_HEADERS === "0") return false;
  return Boolean(process.env.VERCEL);
}

export function clientKey(request: Request, userId?: string): string {
  if (userId) return `u:${userId}`;
  if (!trustsProxyHeaders()) {
    // Without a trusted proxy every request shares one bucket. That is a blunt
    // global limit, but it is not spoofable.
    return "ip:untrusted";
  }
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || "unknown";
  return `ip:${ip}`;
}
