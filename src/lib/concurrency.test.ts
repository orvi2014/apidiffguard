import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runPool } from "@/lib/concurrency";

const tick = () => new Promise((r) => setImmediate(r));

describe("runPool", () => {
  it("processes every item when there is time", async () => {
    const items = [1, 2, 3, 4, 5, 6, 7];
    const { results, deferred } = await runPool(items, async (n) => n * 2, {
      concurrency: 3,
    });
    assert.equal(deferred, 0);
    assert.deepEqual([...results].sort((a, b) => a - b), [2, 4, 6, 8, 10, 12, 14]);
  });

  it("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    await runPool(
      Array.from({ length: 30 }, (_, i) => i),
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await tick();
        inFlight--;
      },
      { concurrency: 4 }
    );
    assert.equal(peak, 4, `peak concurrency was ${peak}, expected 4`);
  });

  it("starts no new work past the deadline and reports the remainder", async () => {
    let clock = 1_000;
    const started: number[] = [];
    const { results, deferred } = await runPool(
      Array.from({ length: 10 }, (_, i) => i),
      async (n) => {
        started.push(n);
        clock += 100; // each task burns 100ms of the budget
        return n;
      },
      { concurrency: 1, deadline: 1_500, now: () => clock }
    );
    // Budget is 500ms at 100ms per task: 5 start, 5 are left for a later tick.
    assert.equal(started.length, 5);
    assert.equal(results.length, 5);
    assert.equal(deferred, 5);
  });

  it("defers everything when already past the deadline", async () => {
    let ran = 0;
    const { results, deferred } = await runPool(
      [1, 2, 3],
      async () => {
        ran++;
        return 1;
      },
      { concurrency: 2, deadline: 0, now: () => 10 }
    );
    assert.equal(ran, 0);
    assert.equal(results.length, 0);
    assert.equal(deferred, 3);
  });

  it("handles an empty list without spawning workers", async () => {
    const { results, deferred } = await runPool([], async () => 1, {
      concurrency: 8,
    });
    assert.deepEqual(results, []);
    assert.equal(deferred, 0);
  });

  it("is faster than serial for network-shaped work", async () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    const work = async () => {
      await new Promise((r) => setTimeout(r, 20));
    };
    const t0 = Date.now();
    await runPool(items, work, { concurrency: 6 });
    const parallel = Date.now() - t0;
    // 12 tasks x 20ms serial is ~240ms; at 6-wide it should be ~40ms.
    assert.ok(parallel < 150, `expected well under serial time, got ${parallel}ms`);
  });
});
