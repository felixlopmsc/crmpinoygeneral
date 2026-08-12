# Open work

Ordered by cost-of-not-doing, not by effort. Delete items as they land.

---

## Not in this repo — dashboard only, but highest priority

**Enable leaked-password protection.**
Supabase → Authentication → Policies. One toggle; checks new passwords against
HaveIBeenPwned. Currently off. Do this before setting any new password.

~~**Two unguarded `SECURITY DEFINER` functions.**~~ Done 2026-08-11, and the
entry was wrong on both counts. Recorded here so it does not get "re-fixed":

- `public.enroll_demo_nurture()` returns `trigger` and is wired as
  `trg_enroll_demo_nurture` on `demo_requests`. PostgREST does not expose
  trigger-returning functions and a direct call errors, so it was never callable
  in a loop. The `PUBLIC`/`anon`/`authenticated` `EXECUTE` grants were real but
  unreachable, and are now revoked. Triggers do not consult `EXECUTE` at fire
  time — verified on the demo project with an equivalent scratch trigger, which
  fired with `has_function_privilege('anon', …) = false`.
- `public.quote_request_accepts_documents(qid uuid)` **must keep its `anon`
  `EXECUTE` grant.** It is the entire `WITH CHECK` expression of the `anon`
  INSERT policy `"Public can upload quote documents"` on
  `quote_request_documents`. RLS evaluates policy expressions as the calling
  role, so revoking the grant — or adding the `is_staff()` guard this entry
  originally called for — breaks anonymous quote-document upload. The
  `SECURITY DEFINER` is load-bearing: it lets `anon` test existence in
  `quote_requests` without being able to read that table, and
  `created_at > now() - interval '1 hour'` bounds the window. Exposure is one
  boolean per correctly-guessed v4 UUID.

Both functions now carry `COMMENT`s stating the above, since the advisor will
keep flagging the second one. This is the same false-alarm class `CLAUDE.md`
already documents for `merge_clients` and the `dq_*` family.

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

**`README.md` on `main` is one line** — the string `crmpinoygeneral`, nothing
else. This repo is public and the product it holds is sold at $12,000; an empty
README is the first thing a prospect, a candidate or a curious developer sees.
Not a request to restore the 210-line version from `claude/impeccable-gx1hkr`
(deleted, and it predated `PRODUCT.md`, `DESIGN.md` and `CLAUDE.md`) — those
three now hold the real content, so a new README should be short and point at
them rather than restate them.

---

## Repo hygiene

~~**Branch cleanup.**~~ Done 2026-08-12. All four deleted; `main` is now the only
branch, locally and on the remote. What each one was, since two of them are gone
for good and a future reader should not have to wonder:

- `docs/design-system` (local, `a740def`) — the competing `DESIGN.md` /
  `design.json` pass. **Never merged**, deliberately discarded; `main`'s is
  canonical.
- `fix/landing-motion` (local, `c26c2ae`) — content confirmed present in `main`
  before deleting. The ancestry test fails, because PR #7 landed as a
  *single-parent* commit (`be688ee`) rather than a merge commit, so the branch's
  own commits were rewritten and `merge-base --is-ancestor` reports NO. Verified
  by content instead: `reveal.tsx`, `stagger.ts` and `.impeccable/design.json`
  are byte-identical to `main`, and `main` has `components/landing/stagger.ts`.
  The remaining differences are `main` moving on afterwards, not lost work.
- `claude/crm-demo-portal-landing-j5dxte` (remote, `0fe3e0d`) — **was never in
  this backlog**, and it is the branch PRs #1–#6 came from. Verified fully merged
  (`merge-base --is-ancestor` YES, zero commits ahead of `main`) rather than
  assumed. Stale, not unreviewed.
- `claude/impeccable-gx1hkr` (remote, `f0003c8`) — one commit, `README.md` only,
  210 lines of project documentation written before `PRODUCT.md`, `DESIGN.md` and
  `CLAUDE.md` existed. Superseded by all three, so deleted rather than merged.
  That commit is unmerged and will be garbage-collected; it is not recoverable.

**The merge-commit convention holds — PR #7 is the only exception.** Audited by
parent count across every PR's recorded merge commit: #1–#6 and #8–#11 are true
merge commits (two parents), `be688ee` (#7) has one. `CLAUDE.md` used to claim
"PRs #1–#9 all follow this" and has been corrected. The durable lesson is the
method, not the count: **if `merge-base` says a branch is unmerged, verify by
content before concluding anything** — a squashed PR rewrites its commits, so
ancestry reports a false negative on work that is genuinely merged.

Note that `git log --grep='Merge pull request #'` finds only four of the ten:
#1–#6 were merged with custom titles. Check each PR's recorded merge commit
instead of grepping subjects.

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
