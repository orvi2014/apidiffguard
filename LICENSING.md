# Licensing & open-core model

APIDiffGuard is an **open-core** product.

## What is open source (MIT)

This repository is licensed under the [MIT License](./LICENSE), including:

- The web application source (self-hostable)
- Free browser tools (`/tools/*`)
- Docs and blog (Fumadocs MDX under `content/`)
- The reusable diff library at [`packages/diff-engine`](./packages/diff-engine) (`@apidiffguard/diff`)

You may use, modify, and self-host the software under MIT terms.

## What we sell (hosted business)

**[APIDiffGuard Cloud](https://apidiffguard.vercel.app)** is the commercial product:

| You get on Cloud | Why teams pay |
| --- | --- |
| Managed auth, workspace, RLS | No ops burden |
| Hosted baselines, checks, diffs | Always on |
| Schedules & alerts (roadmap) | Drift while you sleep |
| Support & upgrades | Production reliability |

Self-hosting means you run Supabase, secrets, deploys, and monitoring yourself. That is allowed. Most customers prefer Cloud.

## Trademarks

“APIDiffGuard”, logos, and product brand assets are **not** licensed under MIT.

You may not use the APIDiffGuard name or branding to offer a competing hosted service that implies official affiliation.

## Contributor notes

- Do not commit secrets (`.env*`, service role keys, API tokens).
- Prefer improvements to `packages/diff-engine` and docs/tools — those help everyone, including Cloud users.
- By contributing, you agree your contributions are MIT-licensed unless stated otherwise.
