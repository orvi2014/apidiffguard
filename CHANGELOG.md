# Changelog

All notable changes to APIDiffGuard are documented here.
The `/changelog` page is generated from this file.

Format: Keep a **newest-first** `[Unreleased]` section, then dated version headings.

## [Unreleased]

### Added
- **Yearly billing.** Starter and Pro can be bought annually at ten months' price for twelve months of service — $190 and $490. The pricing page carries a monthly/yearly switch; Free and the contact-only Team tier are unaffected. Polar puts the billing period on the product rather than the price, so each annual plan is its own product, and the webhook's reverse lookup now recognises those ids — without that a customer could pay for a year and be granted nothing
- **Error reporting.** The app had none: eleven `console.error` sites whose output nobody would ever read, so a production failure was something you learned about from a customer. Sentry is wired for server, edge, and browser, and stays completely inert until a DSN is set
- **The REST API is now more than one route.** `GET /api/v1/endpoints`, `GET /api/v1/endpoints/:id`, `GET /api/v1/diffs`, and `GET /api/v1/diffs/:id` join the existing check route, so an integration can find an endpoint, read its health, and pull the changes from a diff without screen-scraping the console. The `endpoints:read` scope now actually grants something
- **Published an OpenAPI 3.1 spec at [`/openapi.json`](https://apidiffguard.com/openapi.json)**, so clients and agent tooling can be generated rather than hand-written
- **Landing page rebuilt around the diff itself.** The hero now shows a real check readout — every row is output the diff engine actually produces in schema mode, verified against it — instead of an illustrative mock. A side-by-side Diff Viewer pane sits beside the CLI transcript, so "same engine in the console and in CI" is shown rather than claimed
- **The free tier, MIT licence, and the VPN limitation are stated at the signup button**, not buried thousands of pixels down. Cloud can only reach public endpoints; the page says so and points at self-hosting
- **Polar checkout and billing portal**, as an alternative to Stripe. Polar is a merchant of record, so it collects and remits VAT/sales tax rather than leaving that to you. Whichever provider is configured is the one that's live; Polar wins if both are
- **Mattermost alert channel.** Mattermost incoming webhooks need a `text` field, which the generic Webhook channel doesn't send, so pointing one at it failed silently. It's now a channel of its own
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
- **The docs pointed at a settings tab that doesn't exist.** Four places — the REST API and CLI guides, the settings page, and the pricing FAQ — told you to create a token under "Settings → Tokens"; the tab is called **API tokens**. A small thing that wastes the first minute of every integration
- **Workspaces and accounts can be deleted again.** The last-owner guard also fired on cascades, so removing a workspace — or closing an account — was rejected with "a workspace must keep at least one owner". Nothing could ever be deleted, which is a right-to-erasure problem rather than an inconvenience. The rule still holds for a surviving workspace; it no longer applies to one that is itself being removed, and closing an account now takes the workspaces it solely owned with it
- **Authenticated endpoints are actually checked authenticated.** `Authorization` was on the outbound header blocklist, so every Bearer, OAuth, and Basic endpoint was fetched with no credential and came back 401 — with nothing to say the app had discarded the token itself. The instinct was right but aimed at the wrong layer: the risk is forwarding a credential to a host named by a *redirect*, so that is now handled where redirects are followed. Credentials reach the host you named, survive a same-origin redirect, and are dropped the moment a hop changes origin
- **Next 16.3.3 and undici 7.29.0** — clears six high-severity advisories. Production dependencies now report zero vulnerabilities
- **Preview deployments work.** They had no Supabase configuration and could not boot, so nothing could be tested before it was live. Origin resolution also falls back to the deployment's own host instead of `localhost`, so OAuth callbacks, invite links, and alert deep links point at the deployment that sent them
- **The console shares one page shell.** Sixteen routes had grown six different header treatments and sixteen hand-written empty states. They now use one `PageHeader`, one container, and the shared `EmptyState`, so title size, spacing, and the "nothing here yet" moment read the same wherever you land
- **Colour passes contrast everywhere it carries meaning.** The primary button's label sat at 3.45:1 on its own fill and got *darker* on hover — an alpha fade composites downward on a dark ground — so fills now use a dedicated darker blue that lifts instead of fading. Breaking and accent badges moved to lighter on-wash steps, which also lands all five badges in one perceptual band. Two separators that were punctuation at 1.27:1 are drawn rules
- **Every focus ring went from 2.15:1 to 3.86:1.** The one affordance keyboard users depend on was the faintest thing on the page, below the 3:1 WCAG 1.4.11 requires
- **GitHub is now the only way to sign in.** Email + password sign-up is gone. Supabase was running with auto-confirm on, which meant anyone could register under an address they didn't control — the wrong front door for a product whose job is emailing you about breaking changes. GitHub supplies a verified address, and there is no longer a password to reset, leak, or store. `/forgot-password` and `/update-password` are removed, and the email provider is now disabled at Supabase itself — until that switch was thrown the UI was GitHub-only while the auth API still accepted email registrations
- New workspaces are named after your GitHub account and can be renamed in Settings → Workspace, since sign-up no longer asks for a name up front
- Removed the shimmer, shine, beam, and gradient-wash effects from marketing pages. Colour now only ever reports something
- Consistent signup button across header, hero, and footer — one label, one treatment, one primary action per screen
- Merged the two duplicate Q&A sections and dropped the entry that restated the hero
- Brand mark set to Split (solid + outlined before/after panes) across UI, favicon, Apple icon, and social cards
- Slack/Discord alert activity logging no longer writes invalid `endpoint_id` column
- Repeated alerts for the same unchanged break are now suppressed for a cooldown window instead of firing every run
- Alert channels are delivered in parallel and validated per channel, so a Discord URL can't be saved as a Slack channel
- Alert and schedule forms report errors inline instead of through `?error=` codes in the URL
- Scheduled checks stay on cadence instead of drifting later each run, and failures back off before pausing
- Downgraded workspaces stop running scheduled checks

### Fixed
- **A reactivated subscription now restores access.** `subscription.reactivated` was missing from the granting events, so a customer who came back after cancelling would be billed again and left on the free plan
- **Diff highlights failed the WCAG AA contrast minimum** (4.49:1 against a 4.5 threshold). Code panes now sit on the ink surface, which the design system already specified, bringing them to 4.81:1
- **Diff highlighting relied on colour alone.** Changed lines now carry `+`/`−` markers, so the information survives greyscale and colour blindness
- **Touch targets in the site header were below the 44px minimum** — the menu toggle, signup button, brand link, and every mobile drawer row. Sized by pointer type rather than screen width, so a touchscreen laptop benefits and mouse density is unchanged
- Reduced-motion preference now clears animation *delays* as well as durations; a staggered entrance previously stayed invisible for the length of its stagger before snapping in
- Removed seven unused UI components and the now-unreferenced `motion` dependency
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
