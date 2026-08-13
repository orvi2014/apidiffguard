---
target: src/app/page.tsx
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-08-13T03-33-34Z
slug: src-app-page-tsx
---
Method: dual-agent (A: acb6af5167bc42f2e · B: af0fb7d19f0acdab7)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | No active nav state; no scroll orientation on a 4,679px page. |
| 2 | Match System / Real World | 3 | Severity vocabulary used in the hero, defined ~2,400px later. |
| 3 | User Control and Freedom | 3 | "Open console" routes signed-out visitors to a login wall. |
| 4 | Consistency and Standards | 1 | Three button systems; "Start free" ships in two colours on one screen. |
| 5 | Error Prevention | 2 | Scheduling sold in the grid without noting it requires Starter. |
| 6 | Recognition Rather Than Recall | 2 | No legend near the ledger for breaking/warning/info. |
| 7 | Flexibility and Efficiency | 3 | Four routes offered, but no anchor nav on a very long page. |
| 8 | Aesthetic and Minimalist Design | 2 | ~1,000px of always-expanded duplicated Q&A. |
| 9 | Error Recovery | 3 | VPN caveat handles expectation-recovery well. |
| 10 | Help and Documentation | 3 | Strong docs presence; no feature card links to its own doc. |
| **Total** | | **25/40** | **Acceptable (63%)** |

No heuristic scored n/a.

## Design Specificity Verdict

**LLM assessment.** The hero is now authored for this product — the frameless hairline ledger uses real JSON paths, the real severity vocabulary, a `verdict` row, and an entrance that reads as a check completing. It executes DESIGN.md's flat-ground thesis rather than describing it, and could not be pasted onto another SaaS page without rewriting it.

Below the fold — 77% of a 4,679px page — is category-interchangeable. Six lucide-icon cards, a code block beside a paragraph, three text columns, two stacked Q&A sections, a centred closer. Nothing reuses the hairline grammar, the severity colours, or the label/value rhythm the hero establishes. The two halves do not even share a grid: sections 1-5 sit at `max-w-6xl` (left edge 84px), 6-7 at `max-w-3xl` (276px), a 192px jump mid-page.

**Deterministic scan.** `detect.mjs` on `page.tsx`: exit 2, **7 findings, all `design-system-font-size`** — 32px and 72px on the h1, 15px on the lede, 13px mono at four sites. Cross-checked against the ramp, **no false positives**; every value is genuinely absent. `chrome.tsx`: 0 findings.

**Detector blind spots (6 more real drifts it cannot see).** The rule only inspects arbitrary `text-[…]`, so named classes pass silently: `sm:text-lg` 18px, `text-base` 16px, `text-3xl` 30px ×3, `text-2xl` 24px, and `text-xs` 12px ×2 in chrome.tsx — meaning chrome.tsx's clean score is not clean. Two further blind spots: hero CTAs use `rounded-md` 8px against a documented 10px button radius, and hero spacing includes off-scale 28/36/24/16px steps.

**Browser evidence.** Zero console errors, warnings, pageerrors, or failed requests at both viewports. Zero contrast failures across 18 measured pairs; lowest is breaking red at 5.29:1. Exactly one h1, zero skipped heading levels, zero missing alt, all 12 SVGs `aria-hidden`. No content-loss overflow at either size — the only clipped element is the `sr-only` skip link, and the CLI `<pre>` overflow is `auto` and intentional.

**Motion verified numerically.** At ~260ms the stagger is mid-flight (row opacities 1 → 0.673, last two verdicts at 0); at ~2500ms every row and verdict is 1. Under `prefers-reduced-motion: reduce` at 40ms, **all 11 sampled values are exactly 1** — the delay-zeroing fix holds, and without it the stagger would have hidden content for up to 1,010ms.

## Overall Impression

The hero went from rented frame to authored artifact, and disclosing the VPN limitation directly under the CTA is the single best trust decision on the page. But the page now has a split personality: a specific, disciplined hero followed by 3,583px of generic dev-tool template that never once speaks the hero's language.

The most serious finding is not a style issue. **The hero demo contradicts the product's own default behaviour.**

## What's Working

1. **The hero ledger is the product, not a picture of it.** Real severity words, real paths, a verdict row, built from tone and 1px hairlines with no card and no shadow. A competitor could not copy it without building the same engine.
2. **The limitation is disclosed at the moment of commitment.** "Cloud reaches public endpoints only. Behind a VPN? Self-host it — same features, MIT," directly under the primary CTA. Volunteering the hardest constraint before the click is the highest-trust move available to a pre-launch product, and it doubles as proof of the open-core promise.
3. **Copy discipline holds across nine sections.** "Failed runs requeue on the next cron pass." "Exits non-zero on breaking changes." Concrete, checkable, no adjectives.

## Priority Issues

**[P0] The hero demo demonstrates the false positive the product exists to prevent.** Two of four ledger rows are leaf *value* changes: `pagination.per_page 20 → 25` labelled **breaking**, and `data.profile.timezone America/New_York → America/Los_Angeles` labelled **warning**. PRODUCT.md states schema mode is the default precisely so value churn is not drift. The one artifact carrying the page's credibility is showing the behaviour the core differentiator was built to avoid — to an audience that will notice.
*Fix:* make all four rows structural (field removed, type changed, new required property, field added) and add `mode: schema` beside `baseline v4` in the header row, turning the correction into a differentiator.
*Command:* `/impeccable clarify`

**[P1] The product is never shown.** 3,583px below the hero contain zero product imagery, while `product-demo.tsx` sits in the repo exported and imported nowhere — dead code. A visual tool that never shows its visual is asking for faith it has not earned.
*Fix:* put a real Diff Viewer frame beside the existing terminal block in "Same engine in the console and in CI," so console and CI appear as the pair the headline claims.
*Command:* `/impeccable layout`

**[P1] One action, three button systems.** "Start free" is accent-blue `Button size=sm` in the sticky header and a white hand-rolled `h-11 rounded-md` pill in the hero — same words, two weights, one screen. The final CTA pairs that 44px pill with a 36px `Button size=lg`, visibly mismatched in height and radius.
*Fix:* one primary token everywhere; render both final-CTA buttons from the same component at the same size.
*Command:* `/impeccable polish`

**[P1] Signal Blue spent decoratively on six icons.** DESIGN.md's One Voice Rule: the accent marks at most one thing per view and is never used to look branded. Six accent lucide icons out-rank the titles they label, and by the time the reader reaches the page's one real accent affordance the colour has stopped meaning anything.
*Fix:* icons to `muted-foreground`; reserve accent for one action per section.
*Command:* `/impeccable quieter`

**[P2] Two adjacent Q&A sections with duplicated content.** ~1,000px of visually identical stacked prose where scroll fatigue peaks, and the first FAQ answer restates the hero subhead nearly verbatim.
*Fix:* merge into one Q&A section, drop the duplicate entry, generate the JSON-LD from the merged set so AEO coverage is preserved.
*Command:* `/impeccable distill`

**[P2] Scanning Cyan used as a verdict.** `text-info` (#38bdf8) labels the `info` severity in the ledger. DESIGN.md reserves that colour for a check *in flight*, "deliberately outside the verdict trio so an in-progress state is never mistaken for a result." The landing page puts it inside the verdict trio — the exact confusion the rule was written to prevent.
*Fix:* either give `info` a neutral treatment or amend the rule in DESIGN.md.
*Command:* `/impeccable colorize`

## Persona Red Flags

**Jordan (first-timer):** five pieces of product vocabulary (`baseline v4`, `verdict`, breaking/warning/info) used at y≈600 with no legend, defined at y≈3,000. "Baselines you trust" explains baselines using the word "baselines." "Open console" leads to a login form. Two sections claim "same engine" in different wordings — which engine, how many are there? The actual workflow order is never stated above the claims that depend on it.

**Riley (stress tester):** catches the P0 immediately — `20 → 25` flagged breaking is the noise the product claims to filter. Everything aimed at him is absent from the page though present in PRODUCT.md: diff modes, ignore rules, cooldowns, the 2MB cap, credentials encrypted and never readable back, SSRF guarding with IP pinning. "Filtered by severity so noise stays out" makes the anti-noise claim with none of the mechanism. And "Scheduled monitoring" is sold with no note that it requires Starter — he signs up free and finds the headline capability gated.

**Casey (mobile):** 6,849px page; FAQ and final CTA past 5,000px. The `data.profile.timezone` row wraps to three lines at 390px, pushing its `warning` verdict onto line two — the right-hand column she scans breaks alignment exactly where it matters. The CLI `<pre>` truncates mid-flag with no fade or scroll affordance. Final CTA pairs a 44px pill with a 36px button. Credit: the sticky header keeps "Start free" one tap away for all 6,849px — the best mobile decision on the page.

## Minor Observations

- Healthy Green appears nowhere. The product's normal state — "contract matched, nothing changed" — is never depicted, so the visitor only ever sees it reporting failure.
- The `verdict` row, the payoff of the entrance animation, falls below the fold at 1280×1000 and well below on a 1280×800 laptop.
- Two hero small-print links measure 18px tall against a 44px target (inline-text exception applies, but the measurement stands).
- Secondary CTA border is 1.34:1 against the ground, below WCAG 1.4.11's 3:1 for non-text UI boundaries.
- `hello@apidiffguard.com` is distinguished from surrounding prose by colour alone until hover.
- "Open console" uses a `Webhook` icon, which does not mean console.
- `/tools` — three working signup-free tools, the strongest pre-launch proof the product owns — is reachable only from header and footer.
- Motion implementation is clean: transform/opacity only, reduced-motion fully honoured. No issue found.

## Questions to Consider

1. The page says "Built around the diff — not another status board," then spends 3,583px on a status-board layout. If you deleted everything between the hero and the final CTA, what would a skeptical backend engineer actually lose?
2. Your hero flags `20 → 25` as breaking; your default diff mode exists so that change is *not* flagged. Which one is the product?
3. You have three working tools, a published npm package, seven docs pages, and an MIT repo — and the page's entire proof budget is one underlined "MIT open source" in 14px grey. Why is that in the fine print instead of being the second half of the hero?
