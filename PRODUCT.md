<!-- impeccable:product-schema 1 -->

# Agila Management Systems

Agency management platform for independent insurance agencies, built and run by
Pinoy General Insurance Services.

## Platform

Web (responsive, desktop-first for staff workflows, mobile-capable throughout).
Next.js 13 App Router deployed on Vercel; a single deployment serves every
domain, with hostname-aware middleware deciding what `/` means per host:

| Host | Serves |
| --- | --- |
| `agilams.com`, `www.agilams.com` | Agila marketing landing page |
| `demo.agilams.com` | live demo sandbox (auto-signs into seeded data) |
| `ams.pinoygeneralinsurance.com` | staff CRM login |

## Stack

- **Framework:** Next.js 13 (App Router), TypeScript, client-heavy pages
- **UI:** Tailwind CSS, shadcn/ui over Radix primitives, `tailwindcss-animate`,
  Lucide icons, Sonner toasts, Montserrat via `next/font`
- **Data:** Supabase (Postgres + Auth + RLS). Two projects:
  - `fetiakfllzxwibqzfedh` — production (real client PII, RLS by role)
  - `wdynqlrbirvartitpwcn` — demo sandbox (generated data only, hourly
    snapshot reset via `pg_cron`; see `supabase/demo/README.md`)
- **Client selection:** `lib/supabase.ts` picks the project by hostname
  (first label `demo` → sandbox) with a `localStorage` fallback for
  previews/localhost. No env var controls the sandbox target.

## Users

- **Primary: independent insurance agents and small agency staff** (roles:
  Admin, Agent; a Viewer role exists). Their job: keep a book of business
  healthy — clients, policies, renewals, commissions — without living in
  spreadsheets and carrier portals.
- **Secondary: prospect agencies** evaluating Agila through the public landing
  page and the self-serve demo sandbox.
- **Tertiary: insurance consumers** touch the system only through public
  intake forms (quote requests, contact submissions); they never log in.

## Product Purpose

Run an entire independent agency from one system: 360° client/household view,
policy tracking by line of business, automated 90/60/30/7-day renewal alerts,
commission tracking by agent and carrier, cross-sell gap detection, a public
quote-request inbox, pipeline, tasks, documents, and reporting.

## Positioning

Purpose-built for insurance, priced below the incumbents. Comparable agency
systems (AgencyZoom, Better Agency, HawkSoft) start around $199–$399/mo;
generic CRMs are cheaper but don't model renewals or commissions. Agila's
published pricing: founding-agency rate $49/mo locked for life (first 20),
then Solo $79 / Agency $199 / Multi-Office $399, annual at two months free.
Each tier also carries a one-time setup fee — Solo $199, Agency $499,
Multi-Office $999, with founding agencies paying the Solo-tier $199. The fee is
shown on the pricing card itself rather than in a footnote: the buyer's stated
fear is discovering cost after signing, so burying it would cost more trust
than the fee costs money.
Credibility line: built by an agency to run its own book before being sold to
others.

## Operating Context

- The marketing page is a first-visit persuasion surface; the CRM is a
  daily-use operating surface. Motion and delight belong to the former;
  speed and restraint to the latter.
- The demo sandbox is writable by design (a demo where Save fails reads as
  broken) and resets hourly; destructive RPCs (client merge, bulk renames)
  are disabled inside it.
- Leads from the landing page land in `demo_requests` and surface in a
  staff-only inbox at `/demo-requests`.

## Capabilities and Constraints

- Row-level security is enforced in the database, not just the UI; staff
  gating runs through `public.is_staff()` and mirrors `lib/is-staff.ts`.
- The production origin is structurally incapable of pointing at demo data
  (hostname-derived client selection), and demo exits are env-independent:
  prospects exit to `agilams.com`, staff cross to
  `ams.pinoygeneralinsurance.com`.
- `SUPABASE_SERVICE_ROLE_KEY` is used only by Supabase Edge Functions
  (`analyze-cross-sell`, `check-renewals`); it must never gain a
  `NEXT_PUBLIC_` prefix.
- Vercel is the only deployment target (Netlify removed); the hostname
  middleware depends on it.

## Brand Commitments

- **Name:** Agila Management Systems — "AGILA" over a tracked-out
  "MANAGEMENT SYSTEMS" (lockup built in code:
  `components/landing/agila-wordmark.tsx`).
- **Mark:** the Agila eagle over the Filipino sun (navy/crimson eagle, gold
  rays). Concept art exists; a production-grade asset is an open item.
- **Voice:** direct, pain-first, no hedging. The landing page follows the
  STAGE arc (Spark → Tension → Action → Growth → Emotion) and leads with the
  agency's losses, not the product's features.
- Visual language: see `DESIGN.md`.

## Evidence on Hand

- Live surfaces: `agilams.com` (marketing), `demo.agilams.com` (sandbox with
  140 households / 198 policies / $426K premium), `ams.pinoygeneralinsurance.com`
  (staff login). All verified serving per-host as of 2026-07-30.
- Demo sign-in verified in a real browser; hourly reset verified restoring a
  corrupted sandbox end-to-end.
- Pricing, plans, and FAQ copy live in `app/page.tsx` (`PLANS`, `FAQS`).

## Product Principles

1. **The database is the security boundary.** UI checks are convenience;
   RLS is the guarantee.
2. **Demo and production never share a blast radius.** Separate projects,
   separate origins, hostname-derived — never flag-derived — in production.
3. **Frequency governs motion.** First-visit surfaces may delight; daily
   surfaces must be instant (see `DESIGN.md` Do's and Don'ts).
4. **No env-var-dependent correctness.** Env vars may improve destinations,
   never gate them; hard-coded fallbacks keep every exit sane.
5. **Pain before product.** Marketing copy names the leak (lapsed renewal,
   dead lead) before naming the feature.

## Accessibility & Inclusion

- `prefers-reduced-motion` honored globally: transforms sit behind
  `motion-safe:`, fades remain.
- Landing content is fully server-rendered; a `<noscript>` rule reveals all
  reveal-animated content without JavaScript.
- Focus-visible rings on all interactive elements (shadcn defaults kept).
- Open item: contrast of gold-on-navy at small sizes has not been formally
  audited.

## Open Decisions

- Production Agila logo asset (current mark reuses the Pinoy General eagle
  PNG, which reads poorly at nav size).
- Whether `app.agilams.com` will exist as a staff host alongside
  `ams.pinoygeneralinsurance.com`.
- Final pricing before public launch (current numbers are live but
  founder-adjustable; one-line change in `app/page.tsx`).
- Licensee/white-label domains (the middleware's `HOST_ROOT_REWRITES` map is
  built for one-line additions).
