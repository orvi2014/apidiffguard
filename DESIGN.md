---
name: APIDiffGuard
description: A dark, dense instrument panel for watching API contracts drift.
colors:
  ink: "#09090b"
  panel: "#111113"
  raised: "#18181b"
  hairline: "#27272a"
  hairline-quiet: "#1f1f23"
  foreground: "#fafafa"
  foreground-muted: "#c4c4cc"
  signal: "#4f7fff"
  signal-wash: "rgba(79, 127, 255, 0.12)"
  healthy: "#22c55e"
  healthy-wash: "rgba(34, 197, 94, 0.12)"
  warning: "#f59e0b"
  warning-wash: "rgba(245, 158, 11, 0.12)"
  breaking: "#ef4444"
  breaking-wash: "rgba(239, 68, 68, 0.12)"
  scanning: "#38bdf8"
typography:
  display:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3.75rem)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Instrument Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.02em"
  data:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "20px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "#f8fafc"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
    typography: "{typography.title}"
  button-primary-hover:
    backgroundColor: "rgba(79, 127, 255, 0.8)"
    textColor: "#f8fafc"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.foreground-muted}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  button-destructive:
    backgroundColor: "{colors.breaking-wash}"
    textColor: "{colors.breaking}"
    rounded: "{rounded.lg}"
    padding: "0 10px"
    height: "32px"
  input-field:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "36px"
    typography: "{typography.body}"
  badge-breaking:
    backgroundColor: "{colors.breaking-wash}"
    textColor: "{colors.breaking}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
    typography: "{typography.label}"
  badge-healthy:
    backgroundColor: "{colors.healthy-wash}"
    textColor: "{colors.healthy}"
    rounded: "{rounded.sm}"
    padding: "2px 6px"
    typography: "{typography.label}"
  panel-surface:
    backgroundColor: "{colors.panel}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
    padding: "20px"
  list-row:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    padding: "12px 16px"
---

# Design System: APIDiffGuard

## Overview

**Creative North Star: "The Instrument Panel"**

This is a readout, not a website. It sits dark and near-silent while everything is fine, and it becomes unmistakable the moment something is not. Every colour that is not greyscale means something; nothing is tinted for atmosphere. The system assumes a professional who already knows what they are looking at, and it spends its budget on information density rather than on reassurance.

Depth comes from stacked tone, never from shadow. Three greys — `#09090b` ground, `#111113` panel, `#18181b` raised — plus a 1px hairline do all the structural work, which is why the interface stays legible at high density and why a drop shadow immediately looks foreign in it. Monospace is reserved for things that are measured: URLs, latencies, versions, status codes, HTTP methods. It is never a costume for "technical".

The identity comes from the Split mark — a solid pane beside an outlined one, before beside after. That is the product and it is the system: two states, one delta, graded by consequence.

**Key Characteristics:**
- Dark-only by commitment, not by theme toggle (`color-scheme: dark` is pinned)
- Flat by construction: tonal layering and hairlines instead of elevation
- One accent, spent rarely; four semantic status colours, spent precisely
- High density — 32px controls, 11px labels, 12px row padding
- Monospace as data, never as decoration

## Colors

A greyscale instrument with a single blue voice and a four-step status vocabulary. Every non-grey is semantic; none is decorative.

### Primary
- **Signal Blue** (`#4f7fff`): The one interactive voice. Links, focus rings, status dots, the active baseline marker, and the brand tile. It never tints a background.
- **Signal Fill** (`#3560d8`): The same voice one step down, and the *only* value that fills a control behind `#f8fafc` text. Hover lifts to `#3b6ae0`.

**Why two blues.** Signal Blue sits at the lightness where it reads beautifully as text on Ink (5.51:1) and fails as a ground beneath white text (3.45:1). Darkening the single token to fix the button drops link text to 3.62:1 — it moves the violation rather than removing it. The hue is one; the roles are two. Never fill a control with Signal Blue, and never set body text in Signal Fill.

### Secondary
- **Signal Wash** (`rgba(79, 127, 255, 0.12)`): The 12% version, used only where the accent must sit behind text — the active-baseline chip and text selection. Text on this wash is **Signal On-Wash** (`#7ba3ff`), not Signal Blue.

### Tertiary
The status vocabulary. These are readings, not palette colours; each has a paired 12% wash used as its badge ground.

- **Healthy Green** (`#22c55e`): The contract matched the baseline.
- **Warning Amber** (`#f59e0b`): Drift that will not break a client yet.
- **Breaking Red** (`#ef4444`): A change that breaks consumers. Also carries destructive actions.
- **Scanning Cyan** (`#38bdf8`): Two jobs, both low-stakes. A check in flight (the scanning badge), and the `info` severity — a change that is real but breaks nothing, such as an added field. It is the only status colour that never means "act now", which is what lets it serve both without confusion.

### Neutral
- **Ink** (`#09090b`): The ground. Page background and input wells.
- **Panel** (`#111113`): The first layer up. Cards, sidebars, popovers, the console header.
- **Raised** (`#18181b`): The second layer up. Secondary buttons, hover states, elevated chips.
- **Hairline** (`#27272a`): Structural borders — the lines that build the grid.
- **Quiet Hairline** (`#1f1f23`): Dividers inside a group, where a full border would over-segment.
- **Foreground** (`#fafafa`): Primary text.
- **Muted Foreground** (`#c4c4cc`): Secondary text. Deliberately light enough to clear 4.5:1 on Panel — this is readable secondary text, not a disabled grey.

### Named Rules

**The One Voice Rule.** Signal Blue marks at most one thing per view: the action you would take, or the state you are in. It is never a surface, never a border above 1px, and never used to make something look branded. Its scarcity is what keeps the status colours legible beside it.

**The Every Colour Means Something Rule.** If an element is not greyscale, a reader must be able to say what it is reporting. There is no decorative colour in this system. A new hue requires a new meaning, not a new mood.

**The Wash Pairing Rule.** A status colour on a filled ground always uses its own 12% wash (`--*-muted`), never a grey chip with coloured text. The wash is what makes a badge readable at 11px.

## Typography

**Display / Body Font:** Instrument Sans (400, 500, 600), with `ui-sans-serif, system-ui` fallback
**Data / Label Font:** JetBrains Mono (400, 600), with `ui-monospace, SFMono-Regular` fallback

**Character:** One neutral grotesque doing all the speaking, and one monospace doing all the measuring. There is no separate display face; scale and weight carry hierarchy instead. The pairing reads as equipment rather than as editorial — which is correct for a tool read under pressure.

Weights are trimmed to what is used: 400, 500, 600 for sans and 400, 600 for mono. 700 is not loaded and must not be introduced without adding it to the font config.

### Hierarchy
- **Display** (600, `clamp(2.25rem, 5vw, 3.75rem)`, 1.08, `-0.02em`): Marketing headlines only. Never appears inside the console.
- **Headline** (600, `1.25rem`, 1.3): Page titles — endpoint name, section pages.
- **Title** (500, `0.875rem`, 1.4): Section headings and panel headers inside the console.
- **Body** (400, `0.875rem`, 1.6): Prose and form values. Long-form prose caps at 65–75ch.
- **Label** (500, `0.6875rem`, `0.02em`): Badges, table headers, metadata. Uppercase only for severity badges.
- **Data** (JetBrains Mono, 400, `0.6875rem`): URLs, latencies, byte sizes, versions, status codes, tokens.

### Named Rules

**The Measurement Rule.** Monospace is for values a machine produced and a human compares: URLs, durations, sizes, versions, status codes, HTTP methods, JSON paths. Prose never gets it. If the text is not something you would diff, it is not mono.

**The No Display In The Console Rule.** Display type belongs to marketing surfaces. Inside the console the largest text is Headline at `1.25rem`; anything larger steals vertical space from the data the user came for.

## Layout

The console is a full-height application shell, not a scrolling document: a fixed 48px header, a scrolling main region, and optional right rails at `xl` (288px). Marketing pages are centred documents constrained to `max-w-6xl` (72rem) with `max-w-3xl` for headlines and `max-w-xl` for supporting prose.

Density is the defining spatial property. List rows are `12px 16px`. Panel sections are `20px`. Groups separate at `8px`–`12px`, sections at `20px`–`32px`. Marketing sections breathe far wider (`96px` vertical) — the two densities are intentionally different and should not be averaged.

Responsive behaviour is progressive disclosure of columns rather than reflow into cards: endpoint rows drop to `auto 1fr auto` on small screens and expand to five columns at `sm`, hiding environment and latency first because they are the least urgent. Breakpoints are Tailwind defaults (`sm` 640, `md` 768, `lg` 1024, `xl` 1280).

### Named Rules

**The Two Densities Rule.** Console and marketing have separate spatial systems. Console optimises information per pixel; marketing optimises comprehension per scroll. Never import marketing whitespace into the console, or console density into a landing page.

## Elevation & Depth

**This system has no shadows.** Depth is entirely tonal: `#09090b` ground → `#111113` panel → `#18181b` raised, separated by 1px hairlines. `shadow-none` is the most frequently used shadow utility in the codebase — it exists to suppress shadows that component libraries bring with them.

The only shadows in the project belong to marketing effect components (inset highlights inside the shimmer button, one large ambient drop under the product-demo frame). They are surface treatments on a decorative element, not part of the depth system, and they must not migrate into the console.

### Named Rules

**The Flat Ground Rule.** A console surface is distinguished by its tone and its hairline, never by a shadow. If two surfaces need separating and tone is not enough, add a `1px` `#27272a` border — not a drop shadow.

## Shapes

Rectangles with modest, consistent softening. The radius scale is derived from a single `0.5rem` root: `6px` for small chips and badges, `8px` for inputs and panels, `10px` for buttons, and `9999px` for status dots only.

Borders are always `1px`. There is no thicker border anywhere in the system, and no coloured left-border accent on cards or callouts. Status is carried by the fill wash and the text colour, never by a coloured edge.

Silhouettes are rectangular and aligned to a shared grid; nothing is angled, clipped, or asymmetric. The one geometric signature is the Split mark's paired panes — solid beside outlined — which appears as the brand tile and is not reused as a decorative motif.

## Components

### Buttons
- **Shape:** Softly rounded (`10px`), `1px` transparent border reserved for the focus state
- **Primary:** Signal Fill (`#3560d8`) ground, `#f8fafc` text (5.26:1), `32px` tall, `10px` horizontal padding
- **Hover / Focus:** Primary *lifts* to `#3b6ae0` — it never fades toward the page. On a dark ground an alpha fade composites downward, so the button darkens as you reach for it and takes its label to 3.86:1. Focus draws a 3px `rgba(79,127,255,0.8)` ring and a solid border; at the old `0.5` the ring computed 2.15:1 against Ink, under the 3:1 a focus indicator owes. Active nudges down `1px`
- **Secondary:** Raised fill, foreground text — the default for anything that is not the one primary action on the view
- **Ghost:** Transparent until hover, then Raised. Used for destructive and tertiary actions
- **Destructive:** Breaking Red at 10% ground with **Breaking On-Wash** (`#f87171`) text. Never a solid red fill — a filled red button reads as the current state rather than as an action

### Chips / Badges
- **Status badge:** the status colour's 12% wash as ground, the status colour's **on-wash step** as text, `6px` radius, `2px 6px` padding, an optional `6px` dot at the leading edge. Green, amber, and cyan are already light enough to serve as their own on-wash text (6.9–7.3:1); red and blue are the two darkest hues and take lighter steps (`#f87171`, `#7ba3ff`) so all five badges read at one weight
- **Severity badge:** the same construction, uppercase Label type, no dot
- **Method badge:** no ground at all — coloured monospace text only, so the HTTP verb reads as data rather than as a control

### Cards / Containers
- **Corner style:** `8px`
- **Background:** Panel on Ink; Raised only when a second layer is genuinely needed
- **Shadow strategy:** none — see Elevation & Depth
- **Border:** `1px` Hairline; Quiet Hairline for dividers inside a group
- **Internal padding:** `20px` for sections, `12px 16px` for rows

### Inputs / Fields
- **Style:** Ink well on a Panel surface with a `1px` Hairline border and `8px` radius, `36px` tall
- **Focus:** border shifts to Signal Blue with a 3px `rgba(79,127,255,0.5)` ring
- **Error:** border and ring shift to Breaking Red; the message sits below in Breaking Red at Label size

### Navigation
- **Console header:** 48px, Panel ground, `1px` Hairline base. Items are Label-size with a `6px` radius hover in Raised; the active item holds Raised permanently with foreground text
- **Mobile:** the nav scrolls horizontally with hidden scrollbars rather than collapsing into a menu — the destinations are few enough that hiding them costs more than the space saves

### Status Badge (signature component)
The one component that carries the product's meaning, and the only place motion is authored. It has three states in sequence: **scanning** (Scanning Cyan, a narrow sliver traversing the clipped pill at a constant rate), **verdict** (the pill settles from `scale(1.05)` over 320ms on `--ease-settle`, and a single ring blooms off the status dot over 520ms), and **at rest** (a static wash badge). The scan is clipped inside the pill; the verdict ring is deliberately unclipped so it can escape. Motion is opt-in per instance — a list rendering on load has not changed state and must not animate.

## Do's and Don'ts

### Do:
- **Do** build depth from the three-tone stack and a `1px` hairline. Reach for tone before you reach for a border, and for a border before you reach for anything else.
- **Do** pair every status colour with its own 12% wash when it needs a ground.
- **Do** keep monospace for values you would diff — URLs, durations, versions, status codes, paths.
- **Do** hold Signal Blue to one element per view.
- **Do** let colour and text carry state on their own. Every animation here is removable by `prefers-reduced-motion` without losing information, and that must stay true.
- **Do** keep console controls at `32px` and labels at `11px`. The density is the design.

### Don't:
- **Don't** add a box-shadow to a console surface. This system is flat by construction.
- **Don't** reach for consumer-SaaS marketing gloss — gradient meshes, floating glass cards, pastel blobs, illustration-led heroes. *(Confirmed anti-reference.)*
- **Don't** reach for enterprise dashboard chartjunk — donut charts, gauges, KPI tiles, sparkline confetti that decorates instead of informing. *(Confirmed anti-reference.)*
- **Don't** introduce a colour without a meaning. There is no decorative hue in this palette.
- **Don't** use a coloured `border-left` to indicate severity. The wash and the text colour do that job.
- **Don't** use font-weight 700 — it is not loaded. Add it to the font config first or use size for emphasis.
- **Don't** animate a list on mount. Motion marks a transition someone caused, never an arrival.
- **Don't** put Display type inside the console.
