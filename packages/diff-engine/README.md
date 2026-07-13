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

## What stays paid / hosted

APIDiffGuard’s hosted product adds baselines, scheduled checks, OpenAPI contract validation, alerts, workspace history, and the IDE-style console. This package is the core comparison engine — free to use in CI scripts and local tooling.

## License

MIT
