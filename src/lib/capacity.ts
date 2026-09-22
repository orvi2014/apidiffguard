/**
 * What the scheduled-check runner can actually deliver.
 *
 * Tier quotas in `plans.ts` are a promise to one customer. These constants are
 * the ceiling across *every* customer at once, and the two are easy to drift
 * apart: a tier can be raised, or the batch lowered, without anyone noticing
 * the product now sells more than the platform can run.
 *
 * The runner is one Vercel function invocation, pinged by a GitHub Action
 * every five minutes. Checks are network-bound, so throughput is
 * (batch per tick) x (ticks per hour), capped by how many finish inside the
 * invocation's wall clock.
 */

/** Schedules claimed per cron tick. `claim_due_schedules` hard-caps at 200. */
export const BATCH_SIZE = 100;

/** Simultaneous outbound checks. Caps sockets and Supabase connections too. */
export const CONCURRENCY = 8;

/** Stop starting new work here, leaving headroom under maxDuration (60s). */
export const DEADLINE_MS = 45_000;

/** The GitHub Action fires every five minutes. */
export const TICKS_PER_HOUR = 12;

/** Observed cost of one check: outbound request, diff, database writes. */
export const ASSUMED_CHECK_SECONDS = 2.5;

const HOURS_PER_MONTH = 24 * 30;

/** Checks one tick can finish before the deadline, at the assumed cost. */
export function checksPerTick(): number {
  const waves = Math.floor(DEADLINE_MS / 1000 / ASSUMED_CHECK_SECONDS);
  return Math.min(BATCH_SIZE, waves * CONCURRENCY);
}

/** Ceiling across all workspaces combined. */
export function systemChecksPerHour(): number {
  return checksPerTick() * TICKS_PER_HOUR;
}

export function systemChecksPerMonth(): number {
  return systemChecksPerHour() * HOURS_PER_MONTH;
}

/** How many customers on a given monthly quota the runner can carry. */
export function customersSupported(monthlyQuotaPerCustomer: number): number {
  if (monthlyQuotaPerCustomer <= 0) return Infinity;
  return Math.floor(systemChecksPerMonth() / monthlyQuotaPerCustomer);
}
