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
npm run check     # typecheck + opacity guard + demo-host guard + lint
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

### The demo-host guard

`scripts/check-demo-host.mjs` asserts that no production hostname can resolve
to demo mode, whatever the `pgi-demo` flag says. It imports `lib/demo-host.ts`
directly (Node strips the types) and runs a table of hostname/flag pairs plus
every entry in `PRODUCTION_HOSTNAMES`. See **Demo/production resolution** under
Supabase for what it is protecting and why.

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
--merge`). No squash, no rebase, no force push. Every PR except #7 used a merge
commit; #7 (`be688ee`) was squashed, so an ancestry check against its branch
returns a false negative. **If `merge-base` says a branch is unmerged, verify by
content before concluding anything.**

`gh` is installed but not persistently authenticated. Until someone runs
`gh auth login` interactively, use:

```bash
export GH_TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill | sed -n 's/^password=//p')
```

The stored credential is a `gho_` OAuth token missing the `read:org` scope that
`gh auth login --with-token` validates against. `GH_TOKEN` skips that check and
works for create/view/merge — **but not `gh pr edit`**, which goes through
GraphQL and requests org fields, so it fails on the missing `read:org`. To change
a PR body or title, use the REST API instead:

```bash
gh api -X PATCH repos/{owner}/{repo}/pulls/N -f body="$(cat body.md)"
```

---

## Supabase

| Project | Ref | What it is |
|---|---|---|
| CRM – Pinoy General Insurance Services | `fetiakfllzxwibqzfedh` | **Production. Real client data.** |
| Pinoy General Insurance Services App | `wdynqlrbirvartitpwcn` | Demo sandbox, generated data only |

`lib/supabase.ts` picks between them from the hostname. `DEMO_MODE` is derived
from the host, with a localStorage fallback for previews and localhost.

### Demo/production resolution — the hostname decides

**`lib/demo-host.ts` is the single source of this decision.** It is pure: every
function takes a hostname argument and touches no `window` and no
`process.env`, so `middleware.ts` (edge runtime) and `scripts/check-demo-host.mjs`
can both import it without pulling in `@supabase/supabase-js`. `lib/supabase.ts`
wraps it with the real `window.location` and re-exports, so app code keeps
importing from `@/lib/supabase`.

`resolveDemoMode` answers in a fixed order, and the order is the whole point:

1. **Demo host** (first label is `demo`) → sandbox, always.
2. **Production host** (in `PRODUCTION_HOSTNAMES`) → production, always. **The
   `pgi-demo` flag is not consulted.**
3. **Anywhere else** — previews, branch deploys, localhost → the flag decides.
   That is the only thing it was ever for; those hosts have no demo subdomain.

Step 2 is a bug fix, not a redundant guard. Resolution used to be "demo host
OR flag", so a stale `pgi-demo=1` in a staff browser repointed
`ams.pinoygeneralinsurance.com` at the **sandbox that resets hourly**. Real
credentials were checked against it, `/auth/v1/token` returned 400, and staff
simply could not log in. `app/demo/page.tsx` had been setting that flag on
*any* host, production included.

**When a domain is added in Vercel, add it to `PRODUCTION_HOSTNAMES`.** That
list is what makes a host immune to the flag; a production domain missing from
it falls through to step 3 and is one stale localStorage key away from the
sandbox. `scripts/check-demo-host.mjs` asserts the invariant over every entry
in the list, so a new domain gets covered the moment it is added — but only if
it is added.

Hostnames are normalised for case, a trailing root dot and `:port` before
comparison: `window.location.hostname` arrives clean, the `Host` header in
middleware does not.

### Local dev points at **production** by default

The intuition is backwards, so be precise about it. On localhost,
`detectDemoMode()` evaluates `'localhost'.split('.')[0] === 'demo'` → false,
then falls back to the `pgi-demo` localStorage flag, which is unset in a fresh
browser. `DEMO_MODE` is therefore `false`, and the client is built from
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Point those at the
production project and `npm run dev` reads and writes **real client data**, with
no cue beyond the absent demo banner.

Two ways to actually be on the sandbox locally:

- **Visit `/demo` once.** Sets `pgi-demo=1`, hard-reloads so the `lib/supabase`
  singleton re-inits against the sandbox, and signs into the seeded demo
  account. Per-origin and sticky until "Exit demo".
- **Put the sandbox values in `.env.local`** — the safer default for routine
  local work, because it holds even when `DEMO_MODE` is false:

  ```
  NEXT_PUBLIC_SUPABASE_URL=https://wdynqlrbirvartitpwcn.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkeW5xbHJiaXJ2YXJ0aXRwd2NuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU5MTIzMzAsImV4cCI6MjA4MTQ4ODMzMH0.m746YzH9k96Q-8xfVjxpyN-ULaHUQNqzDcfj2vcbpww
  ```

  These are mirrored from `lib/supabase.ts:9-11`, where they are already
  hardcoded. That is deliberate, not a leak: an anon key is designed to ship in
  a browser bundle, the project holds only generated data, and this repo is
  public. No rotation needed.

  **This `.env.local` now exists in the local checkout**, holding those sandbox
  values. It was added on 2026-08-19 because there was none, and without
  `NEXT_PUBLIC_SUPABASE_URL` set `npx next build` fails on every page with
  `Error: supabaseUrl is required.` — `createClient` runs at module scope in
  `lib/supabase.ts`, so a bare checkout cannot build at all. If you hit that
  error, the file is missing, not the code. It is gitignored by `.env*.local`
  (`.gitignore:29`), so it does not travel with the repo and a fresh clone will
  need it recreated.

**The prefix is `NEXT_PUBLIC_`, never `VITE_`.** `VITE_` appears nowhere in this
repo and Next.js will not read it — that prefix belongs to the sibling
`felixlopmsc/pinoy-insurance-portal`, which is Vite/React. A `.env.local` of
`VITE_SUPABASE_*` configures nothing here, and fails in one of two ways: if
`NEXT_PUBLIC_*` is unset, `createClient(undefined, undefined)` throws at
runtime; if it still holds production values, **you are silently on production
while believing you are sandboxed.** Textbook case of the silent-substitution
class below.

### `leads.status` and `quote_requests.status` are different vocabularies

They look interchangeable and are not. Mixing them fails at the database, not
in review.

| Table | Allowed values | Case |
|---|---|---|
| `leads.status` | `new` `contacted` `qualified` `converted` `declined` | lowercase |
| `quote_requests.status` | `New` `Contacted` `Quoted` `Won` `Lost` | Capitalised |

`leads_status_check` is a real CHECK constraint (added in
`20260723200000_normalize_lead_status_priority.sql`), so **writing `'Lost'` to
`leads.status` fails the write** — and `'Lost'` is the obvious wrong guess,
because it is valid on `quote_requests` and reads like the natural
terminal-negative value. The leads equivalent is **`declined`**; `lost` is a
Deals-only status. `LEAD_STATUSES` in `lib/types.ts` is the client-side mirror.

**`leads` has no `deleted_at`** — `quote_requests` and `policies` do. Also note
`app/(dashboard)/leads/page.tsx` hard-deletes via `.delete()`, and there is no
DELETE policy on `leads`: RLS drops the statement, zero rows change, no error
comes back, and the page reports success. That delete button does nothing.

**Production must keep pointing at `fetiakfllzxwibqzfedh`.** Never repoint a
deployed environment at the sandbox, or the sandbox at production.

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

Re-confirmed empirically 2026-08-25, because the warning keeps prompting people
to "fix" it. Simulating a signed-in identity with no `public.users` row — which
is exactly what a portal client is:

| | non-staff | staff |
|---|---|---|
| `is_staff()` | `false` | `true` |
| `merge_clients()` | **blocked — `not authorized`** | — |
| `dq_counts()` | **blocked — `not authorized`** | returns normally |

**Do not revoke `EXECUTE` from `authenticated` on these.** Every one is called
from `'use client'` components (`components/data-quality/*`,
`app/(dashboard)/settings/data-quality/page.tsx`) with the staff user's own
JWT, not server-side with the service role. Revoking breaks the data-quality
tools. The in-body `is_staff()` check is the control, and it is already there.

Two more that must stay callable for different reasons:

- **`is_staff()`** — RLS policies evaluate it as the querying role. Revoke it
  and RLS breaks everywhere.
- **`quote_request_accepts_documents(qid)`** — backs the RLS policy *"Public
  can upload quote documents"*, i.e. the portal's **anonymous** quote-wizard
  document upload. Revoking `anon` breaks public upload. It returns one boolean
  about a UUID the caller must already know.

The two `SECURITY DEFINER` **views** flagged at ERROR were real and are fixed
(`20260825000000_harden_security_definer_views.sql`): `expected_slots` and
`run_health` had granted `anon` full privileges on internal automation health.

### Shared-database DDL lives in THIS repo only

`fetiakfllzxwibqzfedh` is shared with the client portal
(`felixlopmsc/pinoy-insurance-portal`). **All DDL against it — migrations,
functions, views, RLS, grants — belongs in `supabase/migrations/` here, in the
CRM repo, and nowhere else.** The portal repo has its own `supabase/migrations/`
directory; treat it as historical and do not add shared-schema changes to it.

**PR first, apply after merge.** Open the migration PR, get it merged, then run
it against production — so the record precedes the change instead of trailing
it. Applying first and writing the file afterwards leaves a window where the
database and the repo disagree and nobody can tell which is right.

One schema, two apps, one place that defines it. Two migration histories against
one database is how you get a change that exists in one repo's history and not
the other's, and no way to tell which ran.

Any migration touching a shared table (`quote_requests`, `leads`, `clients`,
`policies`, `documents`, `client_profiles`) **must say so in the first line of
its PR description**, because it can break the other app.

### Internal test submissions — mark them, never delete them

`quote_requests.is_test` flags internal submissions. **Flag, don't delete:** the
history survives, and a row that was once counted can still be explained.

**Every staff-facing read must exclude `is_test = true`** — the quote-request
inbox, its counts row, the dashboard widget, and any DR-001 gate
instrumentation. Three query sites do this today
(`app/(dashboard)/quote-requests/page.tsx` ×2,
`components/dashboard/new-quote-requests-widget.tsx`). Add a fourth reader and
it needs the same filter.

**The convention going forward: internal submissions use a `+test`
sub-address** — `felix+test@…`, `felix+test7@…`, any suffix. A `BEFORE INSERT`
trigger derives `is_test` from the email; it is never taken from the client,
because the portal's insert policy is `WITH CHECK (true)` for `anon`, so a
client-supplied flag could otherwise hide a genuine request from the inbox.

Nine rows were flagged on 2026-08-25 after Felix confirmed them individually.
**The list was checked, not assumed** — the instruction described nine rows, the
table held ten, and the tenth was a real client whose policy had just been
bound. Re-measure before flagging anything here: a wrongly flagged row is a
customer who silently leaves the queue.

### DR-001's gate needs `contacted_at`

`contacted_at` records the first time a request was acted on. It did not exist
before 2026-08-25 — the table had only `created_at` / `updated_at` /
`deleted_at`, and `updated_at` moves on any edit, so "median first response"
could not be computed at all.

A `BEFORE UPDATE` trigger stamps it on the **first** status transition and never
overwrites. Rows predating the column carry the earliest *known* touch, or null
where none is known, so early figures are conservative rather than flattering.
**Do not backfill it from `created_at`** — that invents a response that never
happened, which is the one thing the gate exists to detect.

### `handle_new_user` creates a `users` row for EVERY auth user

`on_auth_user_created` fires `AFTER INSERT` on `auth.users` and inserts into
`public.users`. It is the **only** thing that creates a staff row: the CRM's
`/login` has a signup view calling `supabase.auth.signUp()`, and no code in
either repo inserts into `public.users`.

Two consequences that have both bitten:

**1. The role literal and `users_role_check` must agree, or nothing can sign
up.** The trigger originally inserted `'Admin'` — which is why four of five
staff rows share a timestamp with their auth user, and also meant anyone who
signed up became an admin. Changing it to `'Client'` was right, but the
constraint still only allowed `Admin|Agent|Viewer`, so the trigger raised, the
transaction aborted, and **`auth.users` never got the row**. Signup failed
outright in both apps. `client_profiles` held exactly one row for months —
that account already had an Admin row, so `ON CONFLICT DO NOTHING` skipped the
illegal insert. Fixed by `20260825030000_allow_client_role_on_users.sql`.

**If you change the role the trigger inserts, change the constraint in the
same migration.**

**2. A staff member who signs up lands as `Client` and must be promoted by an
Admin.** That is deliberate, not a gap — see the self-serve-admin history
above.

**Rejected: having portal signups create no `users` row at all.** Cleaner in
principle (clients belong in `client_profiles`; `users` is the staff table),
but staff onboarding runs through the same trigger, so removing the insert
means no new staff member can ever be onboarded. Rejected on that alone.
Gating it on signup metadata — the portal sends `first_name`/`phone`, the CRM
sends `full_name` — was also rejected: a silent, guessable signal deciding
whether someone can access the CRM is the kind of thing that fails quietly
years later.

There is no staff user list in this app to filter `Client` rows out of; every
`from('users')` query is scoped to a single id (own profile, audit-log actor
lookup). If you ever add one, filter `role <> 'Client'`.

### `client_profiles.client_id` is the key to a client's whole book

That one column decides which policies, documents and client record a portal
login can read — three RLS policies resolve through it
(`portal_clients_select_own_policies` / `_documents` / `_client`).

**It is not writable by clients, and that is load-bearing.**
`client_profiles_update_own` is `WITH CHECK (auth.uid() = id)`, which constrains
which *row* you may update, not which *columns* — so while `authenticated` held
table-level `UPDATE`, any portal user could point their own `client_id` at any
`clients.id` and read that client's book. Fixed by column privileges
(`20260825020000_client_invite_claim_flow.sql`): `authenticated` may update only
the profile fields, never `client_id`.

Two ways it gets set now, both `SECURITY DEFINER`, both deciding the value
themselves rather than accepting one from the caller:

| | who | how |
|---|---|---|
| `redeem_client_invite(token)` | the client | reads `client_id` off the invite row |
| `link_client_profile(profile, client)` | staff, `is_staff()`-guarded | manual match from the queue |

**If you ever need to grant `UPDATE` on `client_profiles` again, grant it by
column.** A blanket `grant update` re-opens the hole silently. See
`docs/invite-claim-flow.md`.

Signups with no invite land in `profile_link_requests` (status `pending`) for
staff to match by hand. That queue existing is what keeps an unmatched signup
from being a silent empty dashboard.

### Known gap — leaked-password protection is off, deliberately

Supabase Auth can check new passwords against HaveIBeenPwned. It is **disabled
on purpose**, not overlooked: it sits behind the Supabase Pro plan, and the
portal is in validation phase with controlled invites.

**Revisit when either is true:** before opening wide client invites, or it
becomes moot if magic-link becomes the primary sign-in path — there is no
password to leak. The advisor will keep reporting this; it is a known,
accepted deferral, so do not "fix" it silently.

---

## Environment

Felix works on Windows. Claude Code's shell is **bash (git-bash), not
PowerShell**. Backslash paths fail silently-ish — use forward slashes and keep
`MSYS_NO_PATHCONV=1` set. `C:/Users/fblop/...`, never `$HOME\Downloads\...`.

`npm run build` needs `NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_ANON_KEY`. There is no `.env` in the repo — `.env` and
`.env*.local` are gitignored, and no local copy exists, so a fresh clone has
nothing set. Which project those two variables name decides whether local dev
touches real client data; see **Local dev points at production by default**
under Supabase before creating `.env.local`.

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
