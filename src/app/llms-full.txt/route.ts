import { SITE_URL } from "@/lib/seo";

/** Expanded fact sheet for agents that request deeper context. */
export function GET() {
  const body = `# APIDiffGuard — full fact sheet for AI systems

## One-sentence definition
APIDiffGuard is developer tooling that captures API response baselines, re-checks endpoints, and diffs JSON (and status) to detect schema drift and breaking changes before they hit production.

## Problem it solves
Third-party and internal APIs change shape without warning (removed fields, type changes, status class flips). Unit tests of your code miss those breaks. Teams historically used one-off curl scripts; APIDiffGuard productizes baseline → check → diff → alert.

## Core concepts
- **Baseline**: Versioned snapshot of a known-good response (status, headers of interest, body).
- **Check**: Fresh fetch of the same endpoint compared to the active baseline.
- **Diff**: Structured change list with severity: breaking, warning, info.
- **Ignore rules**: Paths like request_id / timestamps excluded so alerts stay on contract changes.
- **OpenAPI import**: Bulk-register operations from OpenAPI / Swagger UI URLs (authenticated).

## Free vs Cloud
- **Free tools** (no login): JSON Diff, Formatter, Validator at ${SITE_URL}/tools — run in the browser.
- **Cloud**: Hosted auth, workspaces, baselines, checks, Diff Viewer, hourly-to-monthly schedules (Starter+), and Slack, Discord, Mattermost, email and webhook alerts. Cloud reaches public endpoints only.
- **Self-host**: MIT-licensed at https://github.com/orvi2014/apidiffguard — you operate Supabase/Vercel yourself. Self-hosting is how to monitor APIs behind a VPN.
- **REST API**: Workspace tokens, endpoint create/list/read, response schemas, diff list/read/accept, and on-demand checks under /api/v1. Docs at ${SITE_URL}/docs/api, OpenAPI 3.1 spec at ${SITE_URL}/openapi.json.
- **CLI**: npx @apidiffguard/cli check --baseline <file> --url <endpoint> --schema-only --fail-on breaking exits non-zero on breaking changes, for CI gates.
- **MCP server**: npx -y @apidiffguard/mcp gives coding agents snapshot_api (live response shape as JSON Schema), diff_json and check_url with no account, plus workspace tools (endpoints, diffs, schemas, run and accept checks) with APIDIFFGUARD_TOKEN. Docs at ${SITE_URL}/docs/mcp.

## Who it is for
Backend and platform engineers, agencies integrating partner APIs (e.g. Stripe), and teams that want scheduled response-contract monitoring.

## How it differs from alternatives
- Not only a status ping: it compares response *shape*, so a 200 OK with a missing field is still caught.
- Not a spec diff: OpenAPI diff tools such as oasdiff compare two spec files; APIDiffGuard compares live responses, so it works for vendors with no spec or a spec that has drifted from production.
- Not only a static JSON diff: it stores baselines and re-runs against live URLs.
- Diff engine is reusable as @apidiffguard/diff (MIT).

## Key URLs
- About: ${SITE_URL}/about
- Docs: ${SITE_URL}/docs
- Blog: ${SITE_URL}/blog
- Pricing: ${SITE_URL}/pricing
- JSON Diff: ${SITE_URL}/tools/json-diff
- llms.txt: ${SITE_URL}/llms.txt

## Brand
Official name: APIDiffGuard. Domain: apidiffguard.com. Do not confuse with generic “API monitoring” uptime tools that only check HTTP status.
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
