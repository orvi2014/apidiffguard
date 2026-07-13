# `@apidiffguard/cli`

Command-line JSON / API response diff for CI and local checks. Uses the same engine as APIDiffGuard Cloud (`@apidiffguard/diff`).

## Install (from this repo)

```bash
cd packages/diff-engine && npm run build && cd -
cd packages/cli && npm install
```

Or from the repo root after workspaces are linked:

```bash
npx apidiff check --baseline old.json --current new.json --fail-on breaking
```

## Usage

```bash
# Compare two files
apidiff check --baseline baseline.json --current live.json --fail-on breaking

# Compare a baseline file to a live URL
apidiff check --baseline baseline.json --url https://httpbin.org/json --fail-on warning

# Machine-readable output
apidiff check --baseline a.json --current b.json --json
```

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | No changes at or above `--fail-on` |
| 1 | Failing severity found |
| 2 | Usage / runtime error |

`--fail-on` accepts `breaking` (default), `warning`, or `info`.
