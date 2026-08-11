# Open work

Ordered by cost-of-not-doing, not by effort. Delete items as they land.

---

## Not in this repo — dashboard only, but highest priority

**Enable leaked-password protection.**
Supabase → Authentication → Policies. One toggle; checks new passwords against
HaveIBeenPwned. Currently off. Do this before setting any new password.

**Two unguarded `SECURITY DEFINER` functions**, callable by anonymous internet
users with no check at all:

- `public.enroll_demo_nurture()` — no arguments, so anyone can call it in a loop
- `public.quote_request_accepts_documents(qid uuid)` — returns a boolean; needs a
  guessed UUID, so lower severity

Either revoke `EXECUTE` from `anon`, or add an `is_staff()` / ownership check to
match how every other `SECURITY DEFINER` function in this schema behaves.

**Verify custom SMTP actually delivers to staff.** Enabled 2026-08-07; the auth
log shows the email rate limiter moving 2 → 30, which is the signature of it
switching on. But no staff reset has ever been attempted — `recovery_sent_at` is
`null` for every account except Felix's. Trigger one for
`zeny_fblopezinsurance@yahoo.com` and confirm it arrives. Yahoo is strict with
new sending domains; check spam before debugging.

---

## In this repo

**`app/(dashboard)/dashboard/page.tsx:302`** — stat cards carry `border-t-2`
alternating gold and crimson by array index. Same anti-pattern as the kanban
column that was removed, and **Impeccable's detector cannot see it**: the rule is
line-local regex and `rounded` lives inside the `<Card>` component rather than on
that line. Left in place because removing the alternation visibly changes the
dashboard — a look-and-feel call, not a defect fix. Two-line change when decided.

**`app/login/page.tsx`, mobile header** — renders `pinoy-general-logo.png` at
80×80. That file is a 744×193 horizontal lockup, so the actual artwork is ~19px
tall there. The desktop version sits on a white card at 200px and reads fine.
Same one-line fix as the sidebar: swap to `pinoy-general-logo-alt.png`. Fenced
off during the branding pass because it serves
`ams.pinoygeneralinsurance.com` — needs an explicit go-ahead.

**Three tables have RLS enabled with zero policies**: `demo_nurture_log`,
`demo_nurture_state`, `renewal_email_log`. This fails *closed*, so nothing leaks
— but only the service role can touch them. Confirm that is intentional and not
a feature quietly doing nothing.

**Housekeeping from the Supabase advisor** — `pg_net` installed in the `public`
schema; mutable `search_path` on three functions in a `dreamlit` schema
(including `send_supabase_auth_email`, which nothing in this repo references —
worth finding out what created it).

---

## Repo hygiene

**Delete the `docs/design-system` branch.** It holds an independent
`DESIGN.md` / `design.json` pass that was never reconciled with the version now
on `main`. Two competing copies of the same canon is how the wrong one ends up
being treated as authoritative. `main`'s is canonical.

**`claude/impeccable-gx1hkr`** — a branch pushed to this public repo by an agent
session, never reviewed. Read it or delete it.

**`fix/landing-motion`** — fully merged via PR #7, safe to delete locally.

**`gh auth login`** — run it once interactively so the `GH_TOKEN` workaround in
`CLAUDE.md` stops being necessary.

---

## Different repo: `felixlopmsc/pinoy-insurance-portal`

Private, Vite/React (`.jsx`), client-facing quote portal. Last production deploy
2026-07-14.

**Auto quote coverage step — remove sub-minimum liability limits.**
California SB 1107 raised the state minimum to **30/60/15**, effective
2025-01-01. The form still offers `15/30` and `25/50`, both **below the legal
minimum a California agency may sell**. This is a compliance issue, not a
preference.

- Remove `15/30` and `25/50`. `30/60` becomes the first selectable option.
- Add `N/A` as the first selectable deductible option, above `$250`. Store it as
  a distinct value (`'na'`), **not** an empty string — otherwise "customer said
  N/A" is indistinguishable from "customer skipped it".

Before editing, three things must be checked:

1. **Where do these fields persist?** Neither Supabase project has a liability or
   deductible column. So it is a JSONB blob, a third project, or not persisted at
   all. If a CHECK constraint, enum, or Zod/Yup schema validates the allowed
   values, changing the dropdown alone will make submits fail.
2. **Do any saved quotes hold `15/30` or `25/50`?** Those records will render an
   empty select when reopened. Decide explicitly — migrate to `30/60`, or keep
   old values displayable but not selectable. Do not leave them silently broken.
3. **Is property damage captured anywhere?** The CA minimum PD went from $5,000
   to $15,000 in the same bill. The dropdown only carries the bodily-injury pair.

That repo has no `CLAUDE.md`. It should get one.
