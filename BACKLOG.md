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

**Have renewal alerts ever actually fired?** Open question — the evidence below
narrows it a long way but does not close it, and the headline marketed feature
depends on the answer.

Baseline, measured 2026-08-12 on the production project:

| Measure | Count |
|---|---|
| `policies` total | 3,693 |
| …`status = 'Active'` | **174** |
| …`status = 'Expired'` | 3,518 |
| …`status = 'Cancelled'` | 1 |
| …expiring in the next 90 days | 31 |
| …expired in the last 90 days | 18 |
| `renewals` | **0** |
| `renewal_log` | 0 |
| `renewal_email_log` | 0 |

**The 3,693 figure is misleading and should not be the one anyone reasons from.**
The renewal-relevant book is the **174 active** policies; 3,518 are already
expired. Every active policy has an expiration date in the future, so the 31
expiring in the next 90 days are all drawn from those 174.

A 2026-08-11 reading gave 3,688 / 31 / 17. The drift is ordinary day-to-day
movement plus new policies, not a discrepancy — but it does mean **these numbers
must be re-measured, not quoted**, before anyone concludes anything from them.

What is established:

- **`renewal_email_log` is written by nothing.** No app code, no edge function,
  no database function or trigger references it; its only mentions in the repo
  are the truncate lists in `supabase/demo/04_reset.sql`. Its emptiness
  therefore says nothing at all about whether email was sent. It is the wrong
  table to reason from.
- **`renewal_log` is the real log.** Written at
  `supabase/functions/check-renewals/index.ts:290`, read by
  `app/(dashboard)/renewals/page.tsx:77` and
  `components/dashboard/upcoming-renewals-widget.tsx:45`. Also 0 rows.
- **Email is fully built — this is not in-app-only.** `check-renewals` composes
  an HTML reminder and POSTs it to the Resend API, gated on `RESEND_API_KEY`.
  Note that a run with the key *unset* still writes a `renewal_log` row with
  `email_status = 'failed'`. So even a keyless run leaves evidence, and there is
  none.
- **Nothing schedules it.** The only row in `cron.job` is `expire-stale-policies`
  (`0 2 * * *`). `check-renewals` is invoked solely by UI buttons on the renewals
  page and the dashboard widget, and its `verify_jwt` is true, so it cannot be
  triggered unauthenticated.
- **pg_cron itself works — this is a missing schedule, not a broken scheduler.**
  `cron.job_run_details` holds 76 runs with **zero** failures, and
  `public.cron_job_log` holds 51 rows running daily from 2026-06-23 through
  2026-08-12 02:00 UTC. So "add a schedule for `check-renewals`" is a plausible
  fix rather than a thing to debug. (Worth noting separately: those 51 runs have
  flipped only 9 rows in total, consistent with the book already being almost
  entirely expired.)
- **Nothing populates `renewals` — searched thoroughly, not assumed.** A
  `pg_proc` scan across every non-system schema, including procedures, found no
  function or procedure that inserts into `renewals` or touches
  `renewal_email_log`. The triggers on `policies` are only
  `update_policies_updated_at` and `trigger_calculate_commission`; neither
  creates renewal rows.
- **The function reads `renewals`, which is empty.** Its query is
  `.from("renewals").in("status", ["Upcoming","Pending","Contacted"])` — with 0
  rows it iterates nothing and sends nothing, no matter who invokes it. Nothing
  in the database populates `renewals`: no trigger, no function. The table's
  INSERT policy grants `authenticated`, so it was designed to be filled by staff
  through the UI.

What is still open — the actual question:

1. **What was supposed to turn the 174 active policies into `renewals` rows?**
   This is the likely root cause and the first thing to chase. If the answer is
   "a step that was never built", the headline feature simply has no input, and
   both log tables are empty for that reason rather than any fault in the email
   path. Note the scale this implies: 174 active policies with 31 expiring inside
   90 days is a volume a person could work by hand, which is one explanation for
   why an absent automation might never have been noticed as missing.
2. Was `renewals` ever populated and later emptied, or has it always been empty?
   If any renewal had been processed, `renewal_log` would hold a row and
   `reminder_30_days` would be `true` on that record. Both are empty, which
   points hard at "never" — but does not prove it.
3. Was `RESEND_API_KEY` ever set on the production project?
4. Is `renewal_email_log` vestigial — an earlier design superseded by
   `renewal_log`? If so it should be dropped rather than left sitting there as a
   decoy for exactly this investigation.

**Not established:** whether `check-renewals` has ever been invoked at all.
Edge-function logs cover only the last 24 hours and came back empty, which proves
nothing about history. Supabase Dashboard → Edge Functions → `check-renewals` →
Invocations retains longer; that is where to look.

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
