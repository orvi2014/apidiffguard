# @apidiffguard/diff

Open-source JSON / API response diff engine used by [APIDiffGuard](https://apidiffguard.com).

Detect added, removed, type-changed, and value-changed fields — with severity (breaking / warning / info) suitable for CI gates.

## Install

```bash
npm install @apidiffguard/diff
```

## Usage

```ts
import { compareJson, summarizeChanges } from "@apidiffguard/diff";

const changes = compareJson(
  { data: { name: "Alex", per_page: 20 } },
  { data: { full_name: "Alex", per_page: 25 } },
  { ignorePaths: ["request_id"] }
);

const summary = summarizeChanges(changes);
// { breakingCount, warningCount, infoCount, added, removed, changed }

if (summary.breakingCount > 0) {
  process.exit(1);
}
```

## What stays paid / hosted

APIDiffGuard’s hosted product adds baselines, scheduled checks, alerts, workspace history, and the IDE-style console. This package is the core comparison engine — free to use in CI scripts and local tooling.

## License

MIT
