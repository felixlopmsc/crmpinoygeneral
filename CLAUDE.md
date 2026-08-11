# Working in this repo

One Next.js 13 App Router deployment serves **three hostnames**. Most mistakes in
this codebase come from forgetting that. Read this before editing.

| Hostname | What it is | Who sees it |
|---|---|---|
| `agilams.com` | Agila marketing site (`app/page.tsx`) | Prospects |
| `demo.agilams.com` | Live sandbox, separate Supabase project, fake data | Prospects |
| `ams.pinoygeneralinsurance.com` | The real staff CRM | Pinoy General staff |

`middleware.ts` rewrites `/` per `Host`. Its matcher is `'/'` only — every other
route is reachable on every hostname.

**Agila is the product being sold. Pinoy General is the agency that built it and
runs on it.** They are different brands and must stay visually distinct.

---

## Rules that are not negotiable

**Never put Agila branding on `ams.pinoygeneralinsurance.com`.** Staff see Pinoy
General. `components/layout/sidebar.tsx` branches on `DEMO_MODE` for exactly
this. `app/login/page.tsx` and `app/reset-password/page.tsx` serve that host —
leave their branding alone unless explicitly told otherwise.

**Never grant blanket command auto-approval while the Supabase MCP is
connected.** Approve individual commands. A wildcard there reaches production
client data.

**Never change Supabase auth or database config without asking.** That includes
Site URL, redirect URLs, SMTP, and RLS. Ask first, every time.

---

## `npm run check` before every commit

```
npm run check     # typecheck + opacity guard + lint
```

**Always also run `npx next build`.** The production build catches things
`tsc --noEmit` cannot — client/server boundary violations and CSS generation
failures. That is not hypothetical: a `'use client'` module exporting a helper
that a Server Component *called* passed typecheck and failed the build.

### The opacity trap

Tailwind only emits an opacity modifier when the number is a step on
`theme.opacity`: `0 5 10 20 25 30 40 50 60 70 75 80 90 95 100`.

Anything else — `/85`, `/45`, `/15` — compiles to **no CSS at all**. No warning,
no error. The element silently keeps whatever it inherited.

This shipped to production: the landing header carried `bg-white/85`, so it had
no background and page content scrolled visibly through the navigation. It read
as a rendering glitch, not a typo, which is why it survived review.

Off-scale values are fine in the arbitrary form: `bg-white/[0.85]`.
`scripts/check-opacity-scale.mjs` enforces this and runs in `npm run check`.

### `transition-all` is banned

Name the properties. The 20 application-code instances are gone. Six remain in
vendored `components/ui/` primitives and **stay** — `shadcn add` overwrites
those files. `toast.tsx` genuinely requires `transition-all` for its
`data-[swipe=move]` transforms; enumerating properties there breaks
swipe-to-dismiss.

Same principle for any other `components/ui/` edit: if you must make one, mark it
`// PROJECT OVERRIDE` with the reason, so it survives the next `shadcn add`.

---

## Design

`DESIGN.md` is canonical — token frontmatter plus eight sections. Read it before
any visual change. Highlights:

- **One gold action per screen.** If three things are gold, nothing is.
- **Crimson is the alarm channel.** Never decorative.
- **Motion is scarce.** Reveal is spent on the hero, the sandbox invitation, the
  founding offer and the pricing grid — nowhere else. Section headings never
  animate.
- **Prefer semantic utilities** (`bg-primary`) over hex literals. The theme
  variables now render the canonical hexes exactly, so tokens propagate and hex
  literals do not.

`.impeccable/design.json` is the machine-readable sidecar. Keep it in sync.

### Brand assets — the shapes are not what the filenames suggest

| File | Actual artwork | Use it for |
|---|---|---|
| `public/agila-glyph.svg` | Square, simplified eagle | Anything under ~200px. **44px floor** — below that the eagle stops resolving |
| `design/brand/agila-eagle-full.png` | Full detailed mark, transparent | Large only. Never served; generate from it |
| `public/pinoy-general-logo.png` | **744×193 horizontal lockup on white** | Wide slots only. Forcing it square renders a white card with illegible type |
| `public/pinoy-general-logo-alt.png` | 604×572 square silhouette, transparent | Square slots — this is the one for icons |

---

## Deploying

Vercel auto-deploys `main` to production and every branch to a preview. Nothing
to trigger manually.

Convention for every change: branch → PR → **merge commit** (`gh pr merge
--merge`). No squash, no rebase, no force push. PRs #1–#9 all follow this.

`gh` is installed but not persistently authenticated. Until someone runs
`gh auth login` interactively, use:

```bash
export GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')
```

The stored credential is a `gho_` OAuth token missing the `read:org` scope that
`gh auth login --with-token` validates against. `GH_TOKEN` skips that check and
works for create/view/merge.

---

## Supabase

| Project | Ref | What it is |
|---|---|---|
| CRM – Pinoy General Insurance Services | `fetiakfllzxwibqzfedh` | **Production. Real client data.** |
| Pinoy General Insurance Services App | `wdynqlrbirvartitpwcn` | Demo sandbox, generated data only |

`lib/supabase.ts` picks between them from the hostname. `DEMO_MODE` is derived
from the host, with a localStorage fallback for previews and localhost.

**`DEMO_MODE` is `false` during server render.** Branching on it at module scope
causes a hydration mismatch — read it in an effect. `sidebar.tsx` shows the
pattern.

Auth uses the **implicit** flow (`flowType` is unset, and the installed
`auth-js` defaults to implicit). That means the recovery token arrives in the URL
fragment and `onAuthStateChange` fires `PASSWORD_RECOVERY`.
`app/reset-password/page.tsx` is built for that. **If anyone ever sets
`flowType: 'pkce'`, that page breaks** and needs an `/auth/confirm` route calling
`verifyOtp`.

Several `public` functions are `SECURITY DEFINER` and callable by
`authenticated`. Supabase's advisor flags them, but `merge_clients`,
`apply_name_fix`, `apply_carrier_mapping` and the `dq_*` family all check
`is_staff()` internally. **Verify the function body before "fixing" an advisor
warning** — most of them are false alarms.

---

## Environment

Felix works on Windows. Claude Code's shell is **bash (git-bash), not
PowerShell**. Backslash paths fail silently-ish — use forward slashes and keep
`MSYS_NO_PATHCONV=1` set. `C:/Users/fblop/...`, never `$HOME\Downloads\...`.

`npm run build` needs `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. There is no `.env` in the repo.

---

## How to work here

**Read the thing, don't reason about the description of it.** Open the PNG, grep
the built CSS, query the table. Nearly every real bug found in this codebase came
from looking rather than inferring, and nearly every wrong call came from the
opposite.

**Watch for silent-substitution bugs.** This stack has a recurring failure
class: input accepted, quietly discarded, default substituted, nothing reported.
Off-scale Tailwind opacity. An un-allowlisted Supabase `redirectTo` falling back
to Site URL. Email refused to non-team addresses. When something "just doesn't
work" with no error, suspect this shape first.

**Verify visually by rendering.** Build, serve, screenshot at 1440×900 and
390×844, scroll to fire every observer. Check reveals aren't stuck hidden, and
check for horizontal overflow at 390.

**Say what you did not check.** A confident report on unverified work is worse
than an honest gap.
