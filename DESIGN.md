---
name: Agila Management Systems
description: The agency system for independent insurance agents — vigilant navy, decisive gold.
colors:
  harbor-navy: "#1B2A4A"
  channel-navy: "#2C3E6B"
  heritage-gold: "#B8962E"
  sunrise-gold: "#D4AD3C"
  barong-crimson: "#8B2D3B"
  parchment-cream: "#F5F0E8"
  warm-white: "#FAF8F5"
  surface-white: "#FFFFFF"
  success-emerald: "#10B981"
typography:
  display:
    fontFamily: "Montserrat"
    fontSize: "48px"
    fontWeight: 700
  headline:
    fontFamily: "Montserrat"
    fontSize: "30px"
    fontWeight: 700
  title:
    fontFamily: "Montserrat"
    fontSize: "20px"
    fontWeight: 600
  body:
    fontFamily: "Montserrat"
    fontSize: "16px"
    fontWeight: 400
  eyebrow:
    fontFamily: "Montserrat"
    fontSize: "12px"
    fontWeight: 600
  micro:
    fontFamily: "Montserrat"
    fontSize: "11px"
    fontWeight: 600
  nano:
    fontFamily: "Montserrat"
    fontSize: "10px"
    fontWeight: 600
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  sm: "8px"
  md: "16px"
  lg: "24px"
  section: "80px"
components:
  button-primary:
    backgroundColor: "{colors.harbor-navy}"
    textColor: "{colors.surface-white}"
    rounded: "{rounded.md}"
    height: "40px"
  button-gold:
    backgroundColor: "{colors.heritage-gold}"
    textColor: "{colors.harbor-navy}"
    rounded: "{rounded.md}"
    height: "44px"
  card:
    backgroundColor: "{colors.surface-white}"
    rounded: "{rounded.2xl}"
    padding: "24px"
---

# Design System: Agila Management Systems

## Overview

**Creative North Star: "The Eagle's Watch"**

Agila's interface carries the posture of its namesake — the eagle over the
Filipino sun: vigilant, steady, unhurried. Deep navy does the watching; it
carries structure, text, and every surface a staff member lives in daily. Gold
is the strike — reserved for the single decisive action on a screen, the way
sunlight lands on one thing at a time. The system reads as a trustworthy
ledger, not a startup toy: generous whitespace, firm type, and motion that
exists only where a first-time visitor is being persuaded.

Two surfaces share this language at different volumes. The marketing page
(persuade) may stagger, reveal, and breathe. The CRM (operate) must be
instant — its only universal motion is the press of a button.

**Key Characteristics:**
- Navy-dominant, gold-accented, crimson only under alarm
- One typeface at every level (Montserrat), hierarchy by weight and scale
- Large radii on containers (16px cards), tight radii on controls (6px)
- Navy-tinted shadows, never gray
- Motion budget spent on first-visit surfaces, not daily ones

## Colors

A two-navy foundation with a two-gold accent: darker of each pair for
grounding, brighter for moments on dark backgrounds.

### Primary
- **Harbor Navy** (#1B2A4A): The anchor. Hero and footer backgrounds, primary
  text on light surfaces, primary buttons.
- **Channel Navy** (#2C3E6B): The lift. Gradient partner to Harbor Navy
  (`from-[#2C3E6B] to-[#1B2A4A]`), sidebar gradient, hover states.

### Accent
- **Heritage Gold** (#B8962E): The decisive action. CTA fills, active borders,
  eyebrow labels, check bullets.
- **Sunrise Gold** (#D4AD3C): Gold's voice on dark — accent text and hover
  brightening on navy backgrounds.

### Semantic
- **Barong Crimson** (#8B2D3B): Urgency and loss only — overdue renewals,
  lapsing policies, destructive intent. Never decoration.
- **Success Emerald** (#10B981): Positive status confirmation (won, paid).

### Neutral
- **Parchment Cream** (#F5F0E8): Section-tint on marketing surfaces, usually
  at 40–50% opacity over white.
- **Warm White** (#FAF8F5): The app-wide page background (`--background`).
- **Surface White** (#FFFFFF): Cards and elevated surfaces.

### Named Rules
**The One Gold Rule.** One gold action per screen. If three things are gold,
nothing is.

**The Crimson Reserve.** Crimson signals something at stake — a lapse, a
loss, a deletion. It never appears for emphasis or variety.

### Theme variables track the canonical hexes
The shadcn theme variables in `app/globals.css` were rounded HSL
approximations of the canonical hexes; they are now exact conversions, so
`bg-primary` and `bg-[#2C3E6B]` render identically:

| Theme variable | Renders as | Canonical |
| --- | --- | --- |
| `--primary`, `--chart-1`: `222.9 41.7% 29.6%` | #2C3E6B | Channel Navy |
| `--secondary`, `--ring`, `--chart-2`: `45.2 60% 45.1%` | #B8962E | Heritage Gold |
| `--accent`, `--destructive`, `--chart-3`: `351.1 51.1% 36.1%` | #8B2D3B | Barong Crimson |

Keep the decimals. Rounding to whole degrees is what put the stylesheet a few
RGB points away from the hex literals in the first place.
`--background` (#FAF8F5) is **not** an approximation of Parchment Cream — it
is a deliberately lighter warm white and a separate token.

## Typography

**Display Font:** Montserrat
**Body Font:** Montserrat
**Character:** A single geometric sans carrying every register — authority
comes from weight and scale, not from mixing families. Wordmark and hero run
heavy (700–800) with tight leading; small labels run uppercase with wide
tracking.

### Hierarchy
- **Display** (700, 36–48px, leading-tight): Hero statements. May go 800 in
  the wordmark ("AGILA").
- **Headline** (700, 30px): Section titles.
- **Title** (600, 18–20px): Card and pain-point headings.
- **Body** (400, 14–16px, relaxed leading): Prose at 60–70ch max width.
- **Eyebrow** (600, 12px, uppercase, tracking 0.14–0.18em): Section kickers.
- **Micro** (600, 10–11px): Badge counts, table column labels, timestamps,
  and dense metadata inside cards. This step is real and used in ~120 places
  across the CRM; it was missing from this document, not from the product.
  10px is the floor — anything smaller is a logotype, not text.

**Logotype exemption.** `AgilaWordmark` is drawn, not set: its "MANAGEMENT
SYSTEMS" line runs 8–11px with 0.18em tracking so it optically matches the
width of "AGILA" above it. Logotype metrics answer to the lockup, not to this
ramp, and the eagle mark's 44px floor is part of the same lockup — below that
the bird stops resolving inside its disc.

## Layout

- **Container:** `max-w-6xl` (1152px) centered, `px-4`/`px-6` gutters.
- **Vertical rhythm:** marketing sections at `py-20` (80px); consistent
  rhythm is treated as a finish signal.
- **Grids:** feature cards 2-up → 4-up responsive (`sm:grid-cols-2
  lg:grid-cols-4`), plans 3-up, `gap-6` (24px) throughout.
- **Prose measure:** constrained (`max-w-2xl`/`max-w-3xl`) — no full-width
  paragraphs.
- **Separation by surface change** (background tint, spacing) before borders;
  borders are earned.

## Elevation & Depth

Shadows are navy-tinted, never gray — depth reads as the brand's own shadow.
Ambient depth stays subtle; strong shadow is reserved for the highlighted
plan card and modals.

### Shadow Vocabulary
- **Ambient** (`shadow-xl shadow-[#1B2A4A]/5`): Forms and preview panels.
- **Hover lift** (`hover:shadow-lg hover:shadow-[#1B2A4A]/5`): Interactive
  cards, paired with a border-color shift to gold.
- **Feature** (`shadow-2xl shadow-[#1B2A4A]/20`): The highlighted pricing
  tier, elevated navy-on-white moments.

## Shapes

Containers are soft, controls are firm: cards and section blocks at 16px
(`rounded-2xl`), inner panels at 12px (`rounded-xl`), buttons and inputs at
6px (`rounded-md`), pills and badges fully round. The contrast between
generous container radii and tight control radii is intentional — friendly
surfaces, precise instruments.

## Components

### Buttons
- **Shape:** 6px radius; heights 36px (sm) / 44px (default) / 48px (lg). The
  default is 44px because it carries every primary CTA on a phone and 44px is
  the Apple HIG touch minimum — not because 44 looks better than 40.
- **Primary:** Harbor Navy fill, white text; hover shifts toward Channel
  Navy. Gradient variant `from-[#2C3E6B] to-[#1B2A4A]` with a
  `border-[#B8962E]/30` gold hairline for marketing CTAs.
- **Gold (decisive):** Heritage Gold fill, Harbor Navy text, 600 weight;
  hover brightens to Sunrise Gold. This is the One Gold Rule's button.
- **Press:** every button scales to 0.97 on `:active` behind `motion-safe:`,
  150ms `ease-out-strong`. Transitions name their properties — never
  `transition-all`.
- **Focus:** 2px ring (`--ring`, gold) with offset.

### Cards
- White surface, `border-[#1B2A4A]/10` hairline, 16px radius, 24px padding.
- Interactive cards hover to a gold border (`hover:border-[#B8962E]/40`) with
  ambient shadow lift.

### Status Badges
- Tinted-background pattern (`bg-*-100 text-*-700`); crimson tints reserved
  per the Crimson Reserve.

### Motion Primitives
- **Easings** (tailwind.config.ts): `ease-out-strong`
  `cubic-bezier(0.23,1,0.32,1)` for entrances; `ease-in-out-strong`
  `cubic-bezier(0.77,0,0.175,1)` for on-screen movement; `ease-drawer`
  `cubic-bezier(0.32,0.72,0,1)` for sheets.
- **Reveal** (`components/landing/reveal.tsx`): opacity + 12px translate,
  400ms, fires once at `+120px` root margin so it settles before it is read.
  Stagger siblings 45–80ms via `staggerDelay(i)`, which caps at the fourth
  sibling — an uncapped `i * n` grows with the array until it reads as lag.
  Under `prefers-reduced-motion` the translate and the stagger both drop and
  the fade shortens to 150ms.
- **Durations:** 150ms press, 200ms hover, 400ms reveal. Interactive UI
  stays under 300ms. Entrance and hover never share an element, so they never
  share a `transition-duration`.
- **The Scarce Motion Rule:** Reveal is spent on the hero, the live-sandbox
  invitation, the founding-agency offer and the pricing grid — and nowhere
  else. Section headings never animate: a heading that fades in is a heading
  the reader cannot read yet, and it is the first thing they need. Motion is
  a spotlight; pointing it at everything lights nothing.

## Do's and Don'ts

### Do:
- **Do** keep one gold action per screen, and make it the most important one.
- **Do** name transition properties explicitly (`transition-transform`,
  `transition-colors`).
- **Do** put transform-based motion behind `motion-safe:` and keep fades for
  reduced-motion users.
- **Do** tint shadows with Harbor Navy, never neutral gray.
- **Do** spend motion on first-visit surfaces; keep daily CRM screens
  instant.
- **Do** prefer semantic utilities (`bg-primary`, `border-border`) over brand
  hex literals; the theme variables now render the canonical hexes exactly, so
  a token change propagates and a hex literal does not.

### Don't:
- **Don't** use `transition-all`. The 20 application-code instances are gone;
  what remains is six vendored shadcn/ui primitives (`toast`, `tabs`,
  `accordion` ×2, `input-otp`, `progress`), left alone deliberately because
  `shadcn add` overwrites them. `toast.tsx` in particular *needs*
  `transition-all` — it drives transforms through `data-[swipe=move]`
  attribute selectors, and enumerating properties there breaks
  swipe-to-dismiss.
- **Don't** write an opacity modifier that is off Tailwind's scale. The scale
  is `0 5 10 20 25 30 40 50 60 70 75 80 90 95 100`; anything else — `/85`,
  `/45`, `/15` — compiles to **no CSS at all**, so the element silently keeps
  whatever it inherited. This shipped: the landing header carried
  `bg-white/85`, which meant it had no background in production and content
  scrolled visibly through the navigation. Off-scale values are fine in the
  arbitrary form (`bg-white/[0.85]`). `npm run check:opacity` enforces this.
- **Don't** use crimson decoratively — it is the alarm channel.
- **Don't** enter elements from `scale(0)`; start at 0.95 with opacity.
- **Don't** animate keyboard-triggered or high-frequency actions.
- **Don't** mix a second typeface; hierarchy comes from Montserrat's weights.
- **Don't** re-animate scroll reveals on every pass — fire once.
