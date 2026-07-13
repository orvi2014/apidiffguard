import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  compareJson,
  compareStatusCodes,
  summarizeChanges,
} from "./diff-engine";

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
    const changes = compareJson({ a: 1, b: true }, { a: 2, c: false });
    const summary = summarizeChanges(changes);
    assert.ok(summary.changed >= 1);
    assert.ok(summary.removed >= 1);
    assert.ok(summary.added >= 1);
  });

  it("schemaOnly ignores leaf value changes but keeps structure", () => {
    const changes = compareJson(
      { name: "Alex", age: 30, role: "admin" },
      { name: "Sam", age: 30, role: "admin", team: "platform" },
      { schemaOnly: true }
    );
    assert.ok(!changes.some((c) => c.path === "name"));
    assert.ok(changes.some((c) => c.path === "team" && c.type === "added"));
  });

  it("matches array items by id so reorder is quiet", () => {
    const baseline = {
      users: [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ],
    };
    const reordered = {
      users: [
        { id: 2, name: "B" },
        { id: 1, name: "A" },
      ],
    };
    const indexNoise = compareJson(baseline, reordered, {
      schemaOnly: false,
      arrayIdentity: false,
    });
    const identityQuiet = compareJson(baseline, reordered, {
      schemaOnly: false,
      arrayIdentity: true,
    });
    assert.ok(indexNoise.length > 0);
    assert.equal(identityQuiet.length, 0);
  });

  it("flags nullability changes as breaking", () => {
    const changes = compareJson({ email: "a@b.com" }, { email: null });
    assert.equal(changes[0]?.type, "nullability_changed");
    assert.equal(changes[0]?.severity, "breaking");
  });
});

describe("compareStatusCodes", () => {
  it("treats same-class status change as warning", () => {
    const change = compareStatusCodes(200, 201);
    assert.ok(change);
    assert.equal(change?.severity, "warning");
  });

  it("treats class change as breaking", () => {
    const change = compareStatusCodes(200, 500);
    assert.ok(change);
    assert.equal(change?.severity, "breaking");
  });

  it("returns null when unchanged", () => {
    assert.equal(compareStatusCodes(200, 200), null);
  });
});
