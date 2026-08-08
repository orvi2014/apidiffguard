# Changelog

All notable changes to APIDiffGuard are documented here.
The `/changelog` page is generated from this file.

Format: Keep a **newest-first** `[Unreleased]` section, then dated version headings.

## [Unreleased]

### Added
- **Multiple workspaces**: a switcher in the console header, and workspace creation from Settings → Workspace. Which workspace you see is now your choice instead of whichever one you joined first
- **Members and invites**: invite by email with a role, revoke pending invites, change roles, and remove or leave a workspace. Plans carry seat limits, and a workspace can never be left without an owner
- **Email alerts**, delivered through Resend. New addresses confirm before anything is sent to them, so the channel can't be pointed at a stranger's inbox
- **Alert retries**: a failed delivery is queued and retried with backoff for roughly three hours before being dead-lettered, instead of being lost
- **Monthly check quotas** per plan, shown on the billing page and enforced before any outbound request
- Published `@apidiffguard/cli` and `@apidiffguard/diff` to npm (`npx @apidiffguard/cli`)
- Workspace API tokens (`adg_live_…`) and `POST /api/v1/endpoints/:id/check`
- Ignore rules panel on endpoint detail
- OpenAPI path-param materialization + visible/clearable response contracts
- CLI `--header` / `--schema-only` for private URL checks

- Account menu in the console header, with profile, workspace, billing, and sign-out
- Pagination on the endpoints and diffs lists, so nothing is silently cut off past the old caps
- API tokens now carry scopes; revoking a token keeps it in the audit trail instead of deleting the record
- Error and 404 pages with a retry action, replacing Next.js's unbranded default screen
- Payment-failure banner in the console — a declined card is visible while Stripe is still retrying, not after cancellation
- Retention and reaper maintenance job (hourly), trimming old response bodies and releasing checks stuck on "Checking…"

### Changed
- Brand mark set to Split (solid + outlined before/after panes) across UI, favicon, Apple icon, and social cards
- Slack/Discord alert activity logging no longer writes invalid `endpoint_id` column
- Repeated alerts for the same unchanged break are now suppressed for a cooldown window instead of firing every run
- Alert channels are delivered in parallel and validated per channel, so a Discord URL can't be saved as a Slack channel
- Alert and schedule forms report errors inline instead of through `?error=` codes in the URL
- Scheduled checks stay on cadence instead of drifting later each run, and failures back off before pausing
- Downgraded workspaces stop running scheduled checks

### Fixed
- **Endpoint credentials are now encrypted at rest** and can no longer be read back by anyone — including owners. Bearer tokens, API keys, and basic-auth passwords were stored as plaintext that every workspace member, viewers included, could read
- **DNS rebinding could reach internal addresses.** A hostname that passed validation could resolve to something else by the time the connection was made; the resolved address is now checked and pinned for the life of the request
- **Viewers could trigger checks through the REST API**, bypassing the role check enforced in the UI
- **Alert payloads could be sent over plain HTTP**; webhook delivery now requires HTTPS
- **A failed baseline write could leave an endpoint with no baseline at all**, breaking every later check
- Endpoint URLs are validated on create, update, and OpenAPI import with the same guard the checker uses, instead of failing at check time
- A check now records its result in one transaction, so a failure part-way through can't leave an endpoint showing a state that never happened
- Overlapping cron runs can no longer execute the same schedule twice
- Large response bodies move to object storage instead of growing the database indefinitely; identical payloads are stored once
- Stripe webhooks are now idempotent and ignore out-of-order events, so a replay or late event can't change a workspace's plan
- Response bodies over the size limit are rejected by byte count and aborted mid-stream rather than buffered first
- Schedule cadence uses UTC, so "daily" doesn't shift with the server region and month steps don't skip
- "Checks today" counts from UTC midnight rather than the serving instance's local midnight
- Content-Security-Policy added, and `/api/*` responses are no longer cacheable by intermediaries

## [0.2.0] — 2026-07-13

### Added
- Official brand mark (side-by-side diff panes) for favicon, Apple icon, and social cards
- Working `@apidiffguard/cli` (`apidiff check`) for local/CI JSON and URL diffs
- `CHANGELOG.md` as the source of truth; agents must update it when pushing to `main`

### Changed
- Moved schedule ticks to GitHub Actions (Vercel Hobby cannot run `*/5` cron)
- Documented `CRON_SECRET` for the schedules worker

## [0.1.0] — 2026-07-12

### Added
- Side-by-side Diff Viewer with JSON trees and keyboard nav
- Endpoint management, baselines, schedules, and alert history
- Command palette (⌘K) and IDE-style console shell
- Fumadocs documentation and blog
- Free JSON Diff, Formatter, and Validator tools
- Open-core MIT license and hosted Cloud option
