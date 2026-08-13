# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Backend and platform engineers who **own** an HTTP/JSON API and are accountable when a response change breaks the teams consuming it. They ship continuously and cannot manually verify the shape of every response on every deploy, so contract regressions are usually discovered by a consumer filing a bug — after the break is already in production.

The buyer and the user are the same person: the engineer who gets paged. Work is collaborative rather than solo — a workspace holds multiple members with roles (`OWNER`, `ADMIN`, `MEMBER`, `VIEWER`), and `VIEWER` is a genuinely read-only seat for people who need to see drift without being able to change what is monitored.

Secondary, non-authenticated audience: developers who arrive at the free JSON tools or the docs while debugging a specific problem. They are a front door, not the product's job.

## Product Purpose

Capture a known-good API response as a versioned **baseline**, re-fetch the endpoint on a schedule, diff the new response against the baseline, classify every change by severity, and alert before a consumer notices.

Success is a single event: a breaking change is caught by APIDiffGuard before anyone downstream reports it. The product has failed if a break reaches a consumer first, and it has failed differently if it cries wolf often enough to be muted.

The primary moment of use is **continuous monitoring** of live endpoints. CI gating via the CLI and the REST API is real and supported, but secondary — the docs currently direct people to the console for production monitoring.

## Positioning

This is not uptime monitoring, and the distinction is the whole product. Uptime tells you the endpoint answered. APIDiffGuard tells you the *shape* of the answer changed in a way that will break clients — a removed field, a changed type, a new required property, a success status becoming an error.

The mechanism a neighbouring product could not truthfully copy without building the same thing: **versioned baselines plus a severity-classifying diff engine.** Every change is graded breaking / warning / info, and schema-mode diffing ignores leaf value churn so a timestamp or a rotating id does not read as drift. Ignore rules let a team silence known-noisy paths without silencing the endpoint.

Open core is part of the position, not just the license: the full application is MIT and self-hostable, and Cloud sells **operations** — not running Supabase, cron, and alert delivery yourself.

## Operating Context

The console workflow, in order: create a workspace → add an endpoint (URL, method, auth, headers, optional request body) → capture a baseline from a known-good response → run checks manually or on a schedule → review the diff → either accept it (which promotes the new response to the active baseline) or treat it as a real regression.

Facts about the environment this runs in:

- **Monitored APIs are frequently private.** Endpoints carry stored credentials (bearer, API key, basic, custom header), and the CLI supports `--header` for the same reason.
- **Onboarding is often bulk.** OpenAPI / Swagger import accepts JSON, YAML, or a URL and creates many endpoints in one pass.
- **Alerts land where the team already is:** Slack, Discord, Mattermost, email, and generic webhooks, each with a severity threshold and a cooldown that suppresses repeats of an unchanged break.
- **Scheduled checks run from cron**, hourly through monthly, currently driven by GitHub Actions.
- **Programmatic surfaces exist:** `apidiff check` for local and CI diffs, and `POST /api/v1/endpoints/:id/check` with scoped workspace tokens.
- **Self-hosting means operating infrastructure:** Supabase, scheduled execution, and alert delivery become the operator's problem. That burden is what Cloud sells against.

## Capabilities and Constraints

**Confirmed functionality:** endpoints, baselines (versioned, restorable), checks, diffs with per-change severity, ignore rules, response contracts, OpenAPI import, schedules, multi-channel alerts with cooldowns and retries, workspaces with four roles, invites and seats, API tokens with scopes, a published REST API, and a CLI backed by the MIT `@apidiffguard/diff` package.

**Terminology, used consistently across product, docs, and marketing:** workspace, endpoint, baseline, check, diff, drift, severity (`breaking` / `warning` / `info`), ignore rule.

**Durable technical constraints future work must respect:**

- **Outbound requests are SSRF-guarded.** Private, reserved, loopback, and link-local addresses are refused, and the resolved IP is pinned for the life of the connection. Consequence: an API reachable only inside a VPN or private network **cannot be monitored by Cloud**. Self-hosting is the honest answer for those cases, and the product should say so rather than fail mysteriously.
- **Endpoint credentials are encrypted at rest** and are not readable back by any user, including owners. A credential can be replaced, never displayed.
- **Response bodies are capped** (2 MB per fetch) and large bodies are offloaded to object storage.
- **Diff modes are `schema` and `full`.** Schema mode is the default because value churn is not drift.

**Plan structure** (endpoint limit / monthly check quota / seats): free 3 / 250 / 1 · starter 20 / 5,000 / 3 · pro 100 / 25,000 / 10 · team unlimited, arranged directly. Scheduled checks require Starter or above.

**Explicitly undecided:**

- **No payment provider is configured in production**, so paid plans cannot currently be purchased. Both Polar (merchant of record) and Stripe are implemented; exactly one can be active.
- **The free plan's 1-seat limit is provisional.** It was set to give seat limits a shape and has the side effect of making invites a paid feature. It has not been validated as a pricing decision.
- **Team tier pricing is contact-only** and no self-serve path exists for it.

## Brand Commitments

- **Name:** APIDiffGuard. The brand is a trademark and is explicitly *not* covered by the MIT license — the software is free to use, the name is not.
- **Mark:** the official Split mark (`public/brand/logo-mark.svg`), wordmark lockup (`public/brand/logo.svg`), used through the `BrandLogo` component. The retired "A" letter tile must not return.
- **Open core is a binding promise.** The full app is MIT and self-hostable at **full feature parity**. Cloud sells operations, never exclusive features. Any future work implying a Cloud-only capability contradicts a public commitment in the README.
- **`CHANGELOG.md` is authoritative** and the public `/changelog` page is generated from it. User-facing changes are recorded there, including UX, CLI, docs, branding, billing, and security fixes.
- **Voice, as observed in existing copy** (not yet a user-ratified style guide): plain, technical, specific, and free of hype. Claims are concrete and checkable — "removed fields, type changes, HTTP status class changes" rather than "powerful insights."

## Evidence on Hand

**Real, and usable in any future work:**

- Seven documentation pages (`content/docs/`), a blog, and a changelog generated from `CHANGELOG.md`.
- Three genuinely free tools with no signup: JSON Diff, JSON Formatter, JSON Validator (`/tools/*`).
- A working, published CLI (`@apidiffguard/cli`) and diff engine (`@apidiffguard/diff`) on npm.
- A documented REST API and an existing product-demo component (`src/components/marketing/product-demo.tsx`).
- Brand assets: mark, wordmark, favicon, Apple icon, social cards.
- The MIT license and `LICENSING.md`, which spell out the open-core model.

**Absent — must never be fabricated or implied.** The product is **pre-launch with no customers**. There are no testimonials, no customer logos, no case studies, no usage or scale numbers, no uptime or detection-accuracy benchmarks, no funding, no team-size claims, and no press. Marketing surfaces must earn credibility from the working artifacts above — the live tools, the real CLI, the docs, the open source — and from nothing borrowed.

## Product Principles

1. **A missed breaking change is the only unacceptable failure.** When forced to choose, deliver a noisy alert over a silent miss. This is already encoded in the system: corrupt severity thresholds deliver rather than drop, failed alert deliveries are retried before being dead-lettered.
2. **Severity is the product.** Anything that flattens breaking / warning / info into undifferentiated noise destroys the reason to choose this over uptime monitoring. Protect the signal-to-noise ratio above feature count.
3. **Self-host parity is a promise, not a marketing line.** No capability may become Cloud-only. Cloud competes on operations.
4. **Claim only what exists.** Pre-launch means no borrowed credibility. The working tools, the open source, and the docs are the proof; anything else is a lie with a deadline.
5. **Stored credentials are the most dangerous thing the product holds.** Every design that touches endpoint auth assumes the database will eventually be read by someone who should not have it.
