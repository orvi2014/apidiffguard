# Changelog

All notable changes to APIDiffGuard are documented here.
The `/changelog` page is generated from this file.

Format: Keep a **newest-first** `[Unreleased]` section, then dated version headings.

## [Unreleased]

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
