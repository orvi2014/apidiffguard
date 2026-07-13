<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# APIDiffGuard agent rules

## Changelog (required on push to main)

Whenever you **commit and push** product changes to `main` (this repo’s default branch; treat “master” requests as `main`):

1. Update root [`CHANGELOG.md`](./CHANGELOG.md) in the **same commit** (or an immediate follow-up commit before push).
2. Put user-facing notes under `## [Unreleased]` as `-` bullets, or bump a dated `## [x.y.z] — YYYY-MM-DD` section when shipping a release.
3. Prefer **why / outcome** over file lists. Group with `### Added` / `### Changed` / `### Fixed` when helpful.
4. Do **not** skip the changelog for UX, CLI, docs, branding, billing, or security fixes that users can notice.
5. The marketing page `/changelog` is generated from `CHANGELOG.md` — keep that file authoritative.

## Brand

- Official mark: [`public/brand/logo-mark.svg`](./public/brand/logo-mark.svg) (diff panes on accent tile).
- Wordmark lockup: [`public/brand/logo.svg`](./public/brand/logo.svg).
- Use [`BrandLogo`](./src/components/brand/logo.tsx) in UI — do not reintroduce the old “A” letter tile.

## CLI

- Package: [`packages/cli`](./packages/cli) (`apidiff`).
- Diff engine: [`packages/diff-engine`](./packages/diff-engine) (`@apidiffguard/diff`).
- Keep docs at [`content/docs/cli.mdx`](./content/docs/cli.mdx) aligned with what the CLI actually does.
