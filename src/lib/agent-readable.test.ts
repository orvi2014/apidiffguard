import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { describeChanges, inferSchema, mergeSchemas } from "./agent-readable";

describe("inferSchema", () => {
  it("describes types and nesting without copying values", () => {
    const schema = inferSchema({
      id: 7,
      price: 9.5,
      name: "Secret Customer",
      active: true,
      tags: ["a"],
    });
    assert.deepEqual(schema, {
      type: "object",
      properties: {
        id: { type: "integer" },
        price: { type: "number" },
        name: { type: "string" },
        active: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["id", "price", "name", "active", "tags"],
    });
    assert.ok(!JSON.stringify(schema).includes("Secret Customer"));
  });

  it("marks fields missing from some array items as optional", () => {
    const schema = inferSchema([{ id: 1, nick: "a" }, { id: 2 }]);
    assert.deepEqual(schema.items?.required, ["id"]);
    assert.deepEqual(Object.keys(schema.items?.properties ?? {}), ["id", "nick"]);
  });

  it("unions types that vary across items, folding integer into number", () => {
    const schema = inferSchema([{ v: 1 }, { v: 1.5 }, { v: null }]);
    assert.deepEqual(schema.items?.properties?.v, { type: ["number", "null"] });
  });

  it("keeps an object's required fields when merged with null", () => {
    const merged = mergeSchemas(inferSchema({ a: 1 }), inferSchema(null));
    assert.deepEqual(merged.type, ["object", "null"]);
    assert.deepEqual(merged.required, ["a"]);
  });

  it("detects common string formats", () => {
    const schema = inferSchema({
      at: "2026-10-27T19:11:00Z",
      day: "2026-10-27",
      id: "3f1c2a9e-5b7d-4e1a-9c3b-2d4e6f8a0b1c",
      email: "dev@example.com",
      link: "https://example.com/x",
      plain: "hello",
    });
    const formats = Object.fromEntries(
      Object.entries(schema.properties ?? {}).map(([k, v]) => [k, v.format])
    );
    assert.deepEqual(formats, {
      at: "date-time",
      day: "date",
      id: "uuid",
      email: "email",
      link: "uri",
      plain: undefined,
    });
  });

  it("drops a format the items disagree on", () => {
    const schema = inferSchema([{ v: "dev@example.com" }, { v: "plain" }]);
    assert.equal(schema.items?.properties?.v.format, undefined);
  });

  it("treats an empty array as an array of unknown items", () => {
    assert.deepEqual(inferSchema({ list: [] }).properties?.list, { type: "array" });
  });

  it("stops at maxDepth instead of recursing forever", () => {
    const schema = inferSchema({ a: { b: { c: 1 } } }, { maxDepth: 1 });
    assert.deepEqual(schema.properties?.a.properties?.b, {});
  });
});

describe("describeChanges", () => {
  it("says so when nothing changed", () => {
    assert.equal(describeChanges([]), "No changes.");
  });

  it("leads with counts and the most severe changes", () => {
    const text = describeChanges([
      { path: "data.full_name", type: "added", severity: "info" },
      { path: "data.name", type: "removed", severity: "breaking" },
      {
        path: "data.id",
        type: "type_changed",
        severity: "breaking",
        oldType: "number",
        newType: "string",
      },
    ]);
    assert.equal(
      text,
      "2 breaking, 1 info. data.name removed [breaking]; data.id changed type number → string [breaking]; data.full_name added [info]."
    );
  });

  it("caps the list and says how many were left out", () => {
    const changes = Array.from({ length: 8 }, (_, i) => ({
      path: `f${i}`,
      type: "added",
      severity: "info",
    }));
    assert.match(describeChanges(changes, { limit: 3 }), /; and 5 more\.$/);
  });
});
