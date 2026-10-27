# `@apidiffguard/mcp`

[Model Context Protocol](https://modelcontextprotocol.io) server for [APIDiffGuard](https://apidiffguard.com). It lets coding agents see what an API actually returns before writing code against it, and what changed since.

```bash
claude mcp add apidiffguard -- npx -y @apidiffguard/mcp
```

Other clients:

```json
{
  "mcpServers": {
    "apidiffguard": {
      "command": "npx",
      "args": ["-y", "@apidiffguard/mcp"],
      "env": { "APIDIFFGUARD_TOKEN": "adg_live_…" }
    }
  }
}
```

## Tools

**No account needed**

- `snapshot_api` — call a URL, get the response shape as JSON Schema (no values unless asked)
- `diff_json` — classify the changes between two JSON documents as breaking, warning, or info
- `check_url` — diff a live response against a saved baseline, inline or from a file

**With `APIDIFFGUARD_TOKEN`** (a workspace token from Settings → API tokens)

- `list_endpoints`, `get_endpoint`, `get_endpoint_schema`
- `list_diffs`, `get_diff`
- `run_check`, `add_endpoint`, `accept_diff`

Set `APIDIFFGUARD_URL` to use a self-hosted instance.

Full guide: https://apidiffguard.com/docs/mcp

MIT licensed.
