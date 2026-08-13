---
target: src/app/page.tsx
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-13T03-06-50Z
slug: src-app-page-tsx
---
Method: dual-agent (A: a9ec76add627acc10 · B: ab049eac845cb3b43)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Hero ledger and ProductDemo are unlabeled mocks; nothing marks them "example". |
| 2 | Match System / Real World | 3 | Vocabulary is right, but `baseline v4` and `verdict` appear above the fold with no legend. |
| 3 | User Control and Freedom | 4 | Nothing traps; no modals, no motion gates, skip link present. |
| 4 | Consistency and Standards | 1 | One destination (`/register`), three labels, four button treatments. Three H2 scales. |
| 5 | Error Prevention | 2 | "Open console" sends logged-out visitors to `/login`; "View pricing" leads to plans that cannot be purchased. |
| 6 | Recognition Rather Than Recall | 2 | Hero introduces baseline/verdict/drift/severity; definitions sit ~4,000px down. |
| 7 | Flexibility and Efficiency | 3 | Applicable: free-tools and CLI fast lanes exist, but hero and footer disagree. |
| 8 | Aesthetic and Minimalist Design | 1 | Same diff rendered twice; feature set restated four times; six perpetual border animations. |
| 9 | Error Recovery | 1 | The one hard constraint (Cloud cannot reach VPN-only APIs) is never surfaced. |
| 10 | Help and Documentation | 4 | Applicable: docs in nav, CLI deep link, two answer blocks, real FAQ. |
| **Total** | | **24/40** | **Acceptable (60%)** |

No heuristic scored n/a. 7 applies because the page serves devs arriving for the free tools; 10 applies because docs are one of the only credibility assets a pre-launch product has.

## Design Specificity Verdict

**LLM assessment.** The hero is a rented frame around an owned object, and the frame is louder than the object. The composition — centered oversized light headline, white pill CTA, ghost secondary, blue radial wash — is the generic 2025 dev-tool hero; swap the words and any Vercel-adjacent SaaS uses it unchanged. The hairline ledger is the exception: `GET /v1/users` / `baseline v4` / `data.name removed breaking` / `verdict 2 breaking · 1 warning` could only belong to this product. Below the fold, only the `apidiff check` terminal block is irreplaceable; the rest is template.

The page also contradicts its own design system. DESIGN.md names consumer-SaaS gloss a confirmed anti-reference and holds Signal Blue to one element per view. The page ships a Signal-Blue radial gradient tinting the hero ground, six perpetually animating blue-to-green gradient card borders, and a shimmer button. Green means Healthy in this system; spending it decoratively breaks the "Every Colour Means Something" rule.

**Deterministic scan.** `detect.mjs` on `src/app/page.tsx`: exit 2, **7 findings, all one rule** (`design-system-font-size`). Lines 88 (`2rem`, `4.5rem`), 91 (`15px`), 113/145/156/250 (`13px`). Cross-checked against the DESIGN.md ramp, none is a false positive: `4.5rem` is 20% above the display ceiling (`3.75rem`), `2rem` is below its floor (`2.25rem`), and the four `13px` mono values have no step on a ramp whose only mono size is `0.6875rem`/11px. Findings 4-7 are one repeated decision, not four.

Colors, radii, and spacing measured **zero drift** — every rendered value maps 1:1 to a frontmatter token.

**Detector blind spot worth recording:** the rule only inspects arbitrary `text-[…]` classes, so `sm:text-lg` (18px) on the lede is equally off-ramp and went unflagged. Real count is 8, not 7.

**Browser evidence.** Zero console errors or warnings at 1280 and 390. Zero contrast failures across 13 measured pairs; lowest is `breaking` red on ink at **5.29:1** against a 4.5:1 threshold. Exactly one `<h1>`. Both hero CTAs measure exactly 44×44 — at the threshold with no margin. Two defects the design review did not catch:

- **`ProductDemo` clips on mobile.** At 390px: `scrollWidth 408` inside `clientWidth 348`, `overflow: hidden`. 60px of content cut off and not scrollable.
- **Skipped heading level.** Footer columns jump h2 → h4 with no h3.

No user-visible overlay was injected; the live-mode session had already exited and its server was stopped, so this is CLI plus scripted-browser evidence only.

## Overall Impression

The single best thing on this page and the single worst thing on this page are the same asset shown twice. The hairline ledger is genuinely excellent — a specimen rather than a metaphor, ending on the red verdict line that is the exact moment the product exists for. Then `ProductDemo` immediately replays the identical dataset, and the fear charge decays instead of compounding.

The biggest opportunity is subtraction: delete the duplicate, put the trust argument under the CTA where it can do work, and make one button look like the primary action.

## What's Working

1. **The hairline ledger is a specimen, not a metaphor.** Label left, delta centre, severity right, closing on a `verdict` row. It works because it *is* the deliverable — the visitor evaluates the product by reading the thing the product produces, which is the highest-integrity proof a pre-launch product can offer.
2. **Copy discipline holds throughout.** "Built around the diff — not another status board," "exits non-zero on breaking changes." Every claim is concrete and checkable, and nothing borrows credibility that does not exist.
3. **The CLI terminal block earns trust cheaply.** A real command with real flags and real exit semantics next to a real docs link converts an unverifiable claim into one a skeptic can test on npm in 30 seconds.

## Priority Issues

**[P0] The same diff is shown twice, back to back.** The hero ledger and `ProductDemo` render an identical dataset — same endpoint, same `baseline v4`, same four changes, same `2 breaking 1 warning`. Users read it as the page saying one sentence twice, louder. It costs ~360px desktop and ~1,800px mobile, and to a skeptic it reads as one fixture padded into two. The detector independently found this asset is also **broken** at 390px, clipping 60px with no scroll.
*Fix:* delete `ProductDemo` from the landing page; keep the ledger as the single hero artifact. If a console view is wanted later, show a *different* moment — the Slack alert, or accepting a baseline. Also removes the 871px mobile skeleton and the page's only drop shadow.
*Command:* `/impeccable distill`

**[P1] Four button languages for one action.** `/register` is reached via a blue solid "Start free" (header), a white fill "Start monitoring" (hero), and a blue ShimmerButton "Start free" (footer). In the hero viewport the loudest coloured element is the *header* button while the actual primary is white — a direct inversion of the One Voice Rule.
*Fix:* one label, one treatment. If the white hero fill is the intent, demote the header CTA to ghost and replace the ShimmerButton to match.
*Command:* `/impeccable polish`

**[P1] Zero reassurance at the moment of commitment.** The hero CTA carries no risk-reduction. "Free for 3 endpoints. No credit card." appears exactly once, at ~4,600px desktop / ~7,000px mobile.
*Fix:* one line under the hero CTA row: free for 3 endpoints, no credit card, MIT and self-hostable, plus a GitHub link. Costs 24px; every clause is true per PRODUCT.md.
*Command:* `/impeccable clarify`

**[P1] Off-system decoration contradicts the stated system.** The hero radial gradient tints the ground with Signal Blue, which DESIGN.md forbids explicitly. `ShineBorder` puts perpetual animated blue-to-green gradients on all six feature cards.
*Fix:* delete the radial wash; separate hero from header with tone plus a 1px hairline. Replace `ShineBorder` with a static 1px border. If a hero glow is genuinely wanted, add it to DESIGN.md as a marketing-only token first rather than shipping a silent contradiction.
*Command:* `/impeccable quieter`

**[P2] "Built for teams that ship APIs." is a heading its own paragraph refutes.** The next sentence admits there are no teams. A skeptic reads the pair as a bluff that got walked back.
*Fix:* make the honesty the headline — "Open source, and early." — backed by MIT, the published CLI, the free tools, and the docs.
*Command:* `/impeccable clarify`

**[P2] Type ramp drift and one skipped heading level.** Eight off-ramp font sizes (seven detected, one missed by the rule) and a footer h2 → h4 jump.
*Fix:* either bring the values onto documented steps or add a marketing display step to DESIGN.md; the system currently documents a page that no longer exists.
*Command:* `/impeccable typeset`

## Persona Red Flags

**Jordan (first-timer):** the hero ledger has no title or caption, so he cannot tell whether it is his API, a demo, or a screenshot. `baseline v4` and `verdict` are used with zero explanation. `breaking` / `warning` / `info` appear as bare coloured words with no legend saying breaking is worse. "Open console" is meaningless without an account and routes to `/login`, a dead end.

**Riley (stress tester):** finds no GitHub link, no npm package name, and no MIT badge anywhere above the footer — MIT appears only inside FAQ answer 3. Notices the ledger and ProductDemo agree *exactly* and concludes both are one fabricated fixture. "View pricing" leads to plans that cannot currently be purchased. And the first question a platform engineer asks — can it reach my internal API? — is never addressed; the SSRF guard means Cloud cannot monitor VPN-only endpoints.

**Casey (mobile):** 7,723px page height at 390px. The `data.profile.timezone` ledger row wraps to three lines with `warning` stranded on the right — a broken-looking row on a product about detecting breakage. `ProductDemo` becomes ~1,800px of 13px monospace *and* clips 60px. A sticky blue "Start free" competes with the hero's white "Start monitoring" inside one thumb reach.

## Minor Observations

- Three H2 scales in use with no rule distinguishing them.
- The severity column is a fixed `w-[68px]` span — severity, which PRODUCT.md calls "the product", carries the same visual weight as the change description beside it.
- The "Keyboard-first" band carries one sentence and one button; it reads as leftover scaffolding.
- `ProductDemo` carries the page's only drop shadow, which is precisely why it reads as imported from another design.
- A decorative full-height vertical hairline sits at exactly 50%, aligned to nothing, visible through the ledger.
- Footer exposes `llms.txt` and `llms-full.txt` as human-facing links.
- `homeFaqs` feeds both the visible FAQ and the JSON-LD, so structured data cannot drift from the page. Good.

## Questions to Consider

1. If you deleted `ProductDemo` entirely, what would the page lose that the ledger does not already say more clearly? If the answer is nothing, why is the heaviest, slowest, only-shadowed asset on the page also the most disposable?
2. The most honest sentence on the page is currently an apology buried in section five under a heading that contradicts it. What happens if it becomes the hero subhead, paired with the three things you can actually prove?
3. Your one non-negotiable constraint — Cloud cannot reach a VPN-only API — is the first question your exact buyer asks, and the page is silent. Is that silence buying signups that churn on day one while losing the self-host audience who would have been your best early users?
