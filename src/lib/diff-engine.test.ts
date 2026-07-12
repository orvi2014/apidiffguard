import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { compareJson, summarizeChanges } from "./diff-engine";

describe("compareJson", () => {
  it("detects added, removed, and changed fields", () => {
    const changes = compareJson(
      { name: "Alex", age: 30, meta: { request_id: "a" } },
      { full_name: "Alex", age: 31, meta: { request_id: "b" } },
      { ignorePaths: ["meta.request_id"] }
    );

    const paths = changes.map((c) => c.path).sort();
    assert.ok(paths.includes("name"));
    assert.ok(paths.includes("full_name"));
    assert.ok(paths.includes("age"));
    assert.ok(!paths.includes("meta.request_id"));
  });

  it("flags type changes as breaking", () => {
    const changes = compareJson({ count: 1 }, { count: "1" });
    assert.equal(changes[0]?.type, "type_changed");
    assert.equal(changes[0]?.severity, "breaking");
  });

  it("summarizes severities", () => {
    const changes = compareJson(
      { a: 1, b: true },
      { a: 2, c: false }
    );
    const summary = summarizeChanges(changes);
    assert.ok(summary.changed >= 1);
    assert.ok(summary.removed >= 1);
    assert.ok(summary.added >= 1);
  });
});
