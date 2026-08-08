/**
 * Schedule cadence arithmetic.
 *
 * All arithmetic is done in UTC so the result does not depend on the region the
 * serverless instance happens to run in, and month steps clamp instead of
 * rolling over (Jan 31 + 1 month => Feb 28/29, not Mar 2/3).
 */

export const FREQUENCIES = ["HOURLY", "DAILY", "WEEKLY", "MONTHLY"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

export function isFrequency(value: string): value is Frequency {
  return (FREQUENCIES as readonly string[]).includes(value);
}

/** Days in a given UTC month, accounting for leap years. */
function daysInUtcMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addOneStep(date: Date, frequency: string): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth();
  const d = date.getUTCDate();
  const h = date.getUTCHours();
  const min = date.getUTCMinutes();
  const s = date.getUTCSeconds();
  const ms = date.getUTCMilliseconds();

  switch (frequency) {
    case "DAILY":
      return new Date(Date.UTC(y, m, d + 1, h, min, s, ms));
    case "WEEKLY":
      return new Date(Date.UTC(y, m, d + 7, h, min, s, ms));
    case "MONTHLY": {
      const targetMonth = m + 1;
      const targetYear = y + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;
      const clampedDay = Math.min(
        d,
        daysInUtcMonth(targetYear, normalizedMonth)
      );
      return new Date(
        Date.UTC(targetYear, normalizedMonth, clampedDay, h, min, s, ms)
      );
    }
    case "HOURLY":
    default:
      return new Date(Date.UTC(y, m, d, h + 1, min, s, ms));
  }
}

/**
 * Next run for a schedule, anchored to the run it was *due* at rather than to
 * "now" — otherwise every tick adds the worker's latency and an hourly schedule
 * slides later all day.
 *
 * If the anchor is far enough in the past that several periods were missed
 * (worker outage), we skip forward to the next future slot rather than
 * replaying every missed period.
 */
export function nextRunAt(
  frequency: string,
  anchor?: string | Date | null,
  now: Date = new Date()
): string {
  const base = anchor ? new Date(anchor) : now;
  let next =
    Number.isNaN(base.getTime()) || base.getTime() > now.getTime()
      ? addOneStep(now, frequency)
      : addOneStep(base, frequency);

  // Catch up past a backlog without firing once per missed period.
  let guard = 0;
  while (next.getTime() <= now.getTime() && guard < 1000) {
    next = addOneStep(next, frequency);
    guard += 1;
  }

  return next.toISOString();
}

/**
 * Backoff for a failed run: 15m, 30m, 1h, 2h, 4h, capped at 6h. Returns null
 * once the schedule has failed too many times in a row and should be paused.
 */
export const MAX_CONSECUTIVE_FAILURES = 8;

export function retryRunAt(
  consecutiveFailures: number,
  now: Date = new Date()
): string | null {
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) return null;
  const minutes = Math.min(15 * 2 ** Math.max(0, consecutiveFailures - 1), 360);
  return new Date(now.getTime() + minutes * 60_000).toISOString();
}
