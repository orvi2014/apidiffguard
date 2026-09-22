/**
 * Bounded-concurrency pool with a wall-clock deadline.
 *
 * Built for serverless cron ticks: the invocation has a hard ceiling
 * (`maxDuration`), the work is network-bound, and stopping early is safe
 * because unprocessed items are still leased and return on a later tick.
 *
 * Deliberately not `Promise.all` over everything: unbounded fan-out means
 * unbounded simultaneous outbound requests and database connections.
 */
export type PoolOptions = {
  /** Maximum tasks in flight at once. */
  concurrency: number;
  /** Absolute epoch ms after which no *new* task is started. */
  deadline?: number;
  /** Injectable clock, for tests. */
  now?: () => number;
};

export type PoolOutcome<T> = {
  results: T[];
  /** Items never started, because the deadline passed first. */
  deferred: number;
};

export async function runPool<I, T>(
  items: readonly I[],
  task: (item: I, index: number) => Promise<T>,
  options: PoolOptions
): Promise<PoolOutcome<T>> {
  const now = options.now ?? Date.now;
  const limit = Math.max(1, Math.floor(options.concurrency));
  const results: T[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    for (;;) {
      // Check the clock before claiming work, never after: a task started one
      // millisecond before the ceiling is a task killed halfway through.
      if (options.deadline !== undefined && now() >= options.deadline) return;
      const index = cursor++;
      if (index >= items.length) return;
      results.push(await task(items[index], index));
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );

  return { results, deferred: items.length - results.length };
}
