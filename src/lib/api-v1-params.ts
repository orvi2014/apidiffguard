/**
 * Query-parameter parsing for `/api/v1`.
 *
 * Separate from `api-v1.ts` because that module pulls in the Supabase server
 * client, which reads `next/headers` and cannot be imported outside a request.
 * These are pure functions, so keeping them here makes them directly testable.
 */

export const HEALTH_VALUES = [
  "healthy",
  "warning",
  "breaking",
  "unknown",
  "checking",
] as const;

export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

/**
 * Read a positive integer parameter, falling back when it is absent or junk.
 *
 * The null check is load-bearing: `Number(null)` is `0`, not `NaN`, so a
 * missing parameter would otherwise look like a valid zero and get clamped to
 * the minimum instead of taking the default. An empty string converts to `0`
 * the same way, so both are treated as absent.
 */
function readInt(
  raw: string | null,
  fallback: number,
  min: number,
  max: number
): number {
  if (raw === null || raw.trim() === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.trunc(parsed), min), max);
}

export function readPagination(url: URL): { limit: number; offset: number } {
  return {
    limit: readInt(url.searchParams.get("limit"), DEFAULT_LIMIT, 1, MAX_LIMIT),
    offset: readInt(
      url.searchParams.get("offset"),
      0,
      0,
      Number.MAX_SAFE_INTEGER
    ),
  };
}

export function isHealthValue(value: string): boolean {
  return (HEALTH_VALUES as readonly string[]).includes(value.toLowerCase());
}
