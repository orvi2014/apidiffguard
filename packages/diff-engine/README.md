# @apidiffguard/diff

Open-source JSON / API response diff engine used by [APIDiffGuard](https://apidiffguard.com).

Detect added, removed, type-changed, nullability, and value-changed fields — with severity (breaking / warning / info) suitable for CI gates. Supports schema-only mode, array identity matching, and status-class comparison.

## Install

```bash
npm install @apidiffguard/diff
```

## Usage

```ts
import {
  compareJson,
  compareStatusCodes,
  summarizeChanges,
} from "@apidiffguard/diff";

const changes = compareJson(
  { data: [{ id: 1, name: "Alex" }, { id: 2, name: "Sam" }] },
  { data: [{ id: 2, name: "Sam" }, { id: 1, name: "Alex" }] },
  { schemaOnly: true, arrayIdentity: true }
);

const summary = summarizeChanges(changes);
// reorder + value-stable → empty in schema mode

const status = compareStatusCodes(200, 500);
// breaking — status class changed

if (summary.breakingCount > 0 || status?.severity === "breaking") {
  process.exit(1);
}
```

## Options

| Option | Default | Meaning |
| --- | --- | --- |
| `schemaOnly` | `false` | Ignore leaf value changes; keep structure/type/nullability |
| `arrayIdentity` | `true` | Match object array items by `id` / `_id` / `uuid` / `key` / `slug` / `name` |
| `ignorePaths` | `[]` | Extra paths to skip (plus built-in volatile leaves) |

## Agent helpers

```ts
import { inferSchema, describeChanges } from "@apidiffguard/diff";

inferSchema({ data: [{ id: 1, email: "a@b.co" }, { id: 2 }] });
// JSON Schema: data is an array of objects; id is a required integer,
// email an optional string with format "email". Values are never copied.

describeChanges(changes);
// "2 breaking, 1 info. data.name removed [breaking]; …"
```

`inferSchema` merges array items, so a field missing from some rows comes out optional and a sometimes-`null` field gets both types. `describeChanges` leads with counts, then the most severe changes, and leaves values out so the text is safe to put in chat or logs.

## What stays paid / hosted

APIDiffGuard’s hosted product adds baselines, scheduled checks, OpenAPI contract validation, alerts, workspace history, and the IDE-style console. This package is the core comparison engine — free to use in CI scripts and local tooling.

## License

MIT
