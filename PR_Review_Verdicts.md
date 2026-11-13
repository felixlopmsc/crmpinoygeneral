# PR review verdicts — #29, #30, #31

Reviewed 2026-11-13 against `main` at `fc3e87e`. Read from the diffs and the
resulting trees, not from the PR titles. Nothing was merged and nothing was
pushed to `main`. No Stripe link was opened, created or paid.

## Verdicts

| PR | Branch | Verdict |
|---|---|---|
| **#31** Exempt Founding Circle from the setup fee | `fix/founding-no-setup-fee` | **MERGE** |
| **#30** Terms of Service + Privacy Policy | `docs/terms-and-privacy` | **MERGE** |
| **#29** Point "Claim a founding seat" at Stripe | `feat/founding-seat-stripe-link` | **FIX FIRST** |

**Merge order: #31 → #30 → #29.** All orders merge clean (tested, below), so
the order is about the *money being right*, not about git.

---

## The one thing that matters most

**#29's Stripe link was built on pricing that #31 abolishes.**

#29's own description states the link's terms:

> It now points at the founding-agency Stripe payment link — **$49/mo locked for life, + $199 one-time setup**, the terms DR-002 records.

and the code comment it adds repeats it:

```
 * Stripe payment link for the founding-agency offer ($49/mo locked for life,
 * + $199 one-time setup). Hosted by Stripe; there is no billing integration in
```

#31 removes exactly that fee. With both merged, the page reads (verified by
actually merging both and reading the result):

```
No setup fee — founding agencies onboard free. You get direct roadmap input and
hands-on onboarding; we get your honest feedback.
```

…directly above a button that opens a checkout created to charge $199 up front.

**A founding agency would be told "no setup fee" and then charged one at the
till.** That is the highest-cost defect in the three PRs: it is customer-facing,
it is at the moment of payment, and it is the exact "discovering cost after
signing" fear that PRODUCT.md says the pricing design exists to avoid.

I did not open the payment link, so I cannot confirm its line items — only that
both the PR body and the code comment say it includes the $199. **Before #29
merges, the link needs checking in the Stripe dashboard and, if it does carry
the setup fee, recreating without it.** The comment needs the same correction.

---

## #29 — `feat/founding-seat-stripe-link` → **FIX FIRST**

**Files changed:** `app/page.tsx` only (+18 −1).

**What it does:** adds a module constant and repoints one `href`.

### 1. The exact URL (asked for verbatim)

```
const FOUNDING_SEAT_CHECKOUT_URL = 'https://buy.stripe.com/9B614o2OH89w4pl33YcAo00';
```

**This is not a placeholder.** It is not `[PASTE URL]`, `#`, `TODO`, empty, or a
test link — Stripe test payment links carry a `test_` path prefix
(`buy.stripe.com/test_…`) and this one does not, so it is a **live-mode** link.

It does replace `#book-demo`. Before:

```
            <a href="#book-demo" className="flex-shrink-0">
```

After:

```
            <a href={FOUNDING_SEAT_CHECKOUT_URL} className="flex-shrink-0">
```

So yes — this PR is what turns the "claim" button from a scroll into a real
purchase path.

### 2. Hardcoded seat count — none added

The diff adds **no** count. The only number in the banner is:

```
                <Sparkles className="h-3 w-3" /> Founding agencies · first 20 only
```

which is **byte-identical on `main`** — pre-existing, not this PR's doing. It is
a cap on the offer, not a claim about how many have sold, so it stays true at
zero sales. **Passes.**

Worth keeping: the PR documents, next to the constant, that nothing in the app
or database learns that a seat sold — Stripe is the only record — so a future
"seats claimed" figure needs a webhook and storage, not a literal. That is the
right note in the right place.

### Defects, ranked by cost if wrong

1. **The $199 contradiction with #31** (above). Customer-facing, at checkout.
   Blocks merge.
2. **The code comment becomes false documentation** the moment #31 lands. Same
   edit fixes it.
3. **A live payment link ships with no record of a sale on our side.** Not a
   reason to block — but the day a seat sells, the only evidence is in Stripe,
   and the "first 20" cap cannot be enforced by anything in this codebase.
   Worth deciding before the link is public, not after.

**Verdict: FIX FIRST.** The URL is real and the code is clean; the blocker is
that the price behind it disagrees with #31.

---

## #31 — `fix/founding-no-setup-fee` → **MERGE**

**Files changed:** `PRODUCT.md` (+8 −4), `app/page.tsx` (+7 −9).

All four requested checks pass.

### Founding card only — confirmed

The only pricing lines the diff touches are inside the `$49` founding block. The
three paid tiers' fees are **byte-identical to `main`**, verified in the
resulting tree rather than inferred from the diff's silence:

```
134:    setup: '$199 one-time setup fee',
151:    setup: '$499 one-time setup fee',
169:    setup: '$999 one-time setup fee',
```

and they still render, via the untouched `+ {p.setup}` at line 468. **Solo $199
/ Agency $499 / Multi-Office $999 are intact.**

Removed from the founding card:

```
-                + $199 one-time setup fee — <span className="whitespace-nowrap">the Solo-tier rate</span>
```

### PRODUCT.md amended, not deleted — confirmed

The paragraph survives and still establishes setup fees as a concept; only the
founding exemption is added:

```
+Each of the three paid tiers also carries a one-time setup fee — Solo $199,
+Agency $499, Multi-Office $999. The Founding Circle is exempt: founding
+agencies pay no setup fee and onboard free.
```

### Footnote updated — confirmed

`main` (matches what you quoted from production):

```
-          All plans include the quote request inbox and automated renewals. The setup fee is billed
-          once at onboarding, not monthly. Data migration available as a one-time service on Solo
-          and Agency.
```

Branch:

```
+          All plans include the quote request inbox and automated renewals. Founding agencies pay
+          no setup fee. On other tiers the setup fee is billed once at onboarding, not monthly. Data
+          migration available as a one-time service on Solo and Agency.
```

The exemption is stated and the general rule is preserved for the other tiers.

### Defects

None blocking. One note: the PRODUCT.md addition includes a provenance
parenthetical about the fact being lost in a Bolt overwrite and re-restored by
PR #27. It is accurate as history and harmless, but it is changelog prose inside
a product-positioning document — fine to keep, fine to trim.

**Verdict: MERGE.** This one is correct and self-contained. Merge it first so
the pricing truth lands before anything points a customer at a checkout.

---

## #30 — `docs/terms-and-privacy` → **MERGE**

**Files changed:** `app/privacy/page.tsx` (new, 227), `app/terms/page.tsx` (new,
174), `components/legal/legal-page.tsx` (new, 62), `app/page.tsx` (+12 −2 —
footer links only).

I did **not** assess whether the legal language is correct. Neither of us is a
lawyer, and the PR says the same. What follows is a coverage check only.

### Required coverage — all present

| Required | Found |
|---|---|
| Supabase storage, US region | **Yes** — "a Supabase Postgres database and Supabase Storage bucket hosted in a United States region (AWS us-west-2, Oregon)" |
| Retention | **Yes** — `#retention`, "How long we keep it": life of account plus statutory insurance/tax obligations, deletion on written request, backups roll off separately |
| CCPA rights | **Yes** — `#ccpa`, "California privacy rights": know, access, correct, delete, limit sensitive PI, non-discrimination; states no sale and no cross-context behavioural advertising |
| Subprocessors | **Yes** — table of five: Supabase, Vercel, Stripe, Sentry, Dreamlit, all United States |
| `info@pinoygeneralinsurance.com` as contact | **Yes** — in both pages and added to the site footer |

**The `us-west-2` claim is true.** I checked the live project rather than taking
the document's word: `fetiakfllzxwibqzfedh` reports `region: us-west-2`. A
specific region named in a privacy policy is a checkable factual claim, so it
was worth checking.

Two other claims I was able to corroborate rather than assume:

- The subprocessor table in the code really does contain all five the PR body
  advertises — including **Sentry**, which was not on your list. The PR is right
  that omitting it would have made the list false on day one: Sentry has been
  live on both apps since 2026-09-24.
- The table's description of Sentry's scrubbing (identity removed, bodies and
  cookies dropped, emails/phones/DOBs/licence numbers/tokens redacted) matches
  the redaction patterns actually shipping in the deployed bundle.

### Boilerplate disclaimer — confirmed, and prominent

It is in the **title** — "Add Terms of Service and Privacy Policy (boilerplate —
needs legal review)" — and is the first line of the body:

> ## ⚠️ This is boilerplate. It has not been reviewed by a lawyer.
> … **A California attorney should review both before they're relied on.**

It also lists seven open decisions it explicitly declined to invent answers to
(legal entity, CCPA applicability, retention schedule, DPA/BAA, governing-law
county, refund terms, export window). That is the right posture.

### Defects, ranked by cost if wrong

1. **It lists Stripe as a payment subprocessor.** If #30 merges and #29 never
   does, the policy names a payment processor for a product that cannot take a
   payment. Low cost — forward-looking rather than false, and it resolves the
   moment #29 lands — but if #29 slips a long way, revisit.
2. **Open decision #6 references the $199 setup fee for refund terms.** #31
   makes that fee inapplicable to founding agencies, so the question counsel is
   asked should be re-worded after #31 lands. Documentation only.
3. **Its base was `4f11a926`,** several commits behind current `main`. Merges
   clean anyway (tested), so this is informational.

**Verdict: MERGE**, on the understanding already stated in the PR that the text
is unreviewed boilerplate. Having the pages exist is better than not having them
while strangers can sign up; neither of us is signing off on the wording.

---

## Merge order and conflicts (asked for explicitly)

**#29 and #31 both modify `app/page.tsx`, and so does #30.** All three touch the
same file; none of them touch the same lines.

- **#31** edits the founding card (≈415–427) and the pricing footnote (≈502–508).
- **#29** inserts a constant near line 68 and edits the single `<a href>` line
  (≈437–445).
- **#30** edits only the footer (≈617–628).

The closest call is that `<a href="#book-demo" …>` is the last *context* line of
#31's first hunk and the line #29 *changes*. That is near enough to be worth
testing rather than predicting, so I tested it — with real merge commits in a
throwaway worktree, both ways round:

| Sequence | Result |
|---|---|
| `main` + #31 | clean |
| `main` + #29 | clean |
| `main` + #30 | clean |
| `main` + #31, then #29 | **clean** |
| `main` + #29, then #31 | **clean** |
| …then + #30 | **clean** |

**No rebase is needed in either order, and the second PR will not conflict.**
I confirmed the merged result is coherent, not merely conflict-free: the
founding card ends up with no setup-fee line, the "No setup fee" sentence, and
the Stripe href — all three changes present and intact.

So the recommended order is driven by correctness, not git:

1. **#31 first** — it fixes what the business actually charges.
2. **#30 next** — independent; its only shared file is the footer.
3. **#29 last**, and only after the Stripe link is confirmed to match #31.

Merging #29 before #31 leaves a window where the page advertises a $199 founding
setup fee and the checkout charges it — self-consistent, but it is the pricing
you have decided to abandon.

---

## Secrets, keys and tokens

**None.** I scanned all 605 added/removed lines across the three diffs for
`sk_live` / `sk_test` / `pk_live` / `rk_live` / `whsec_`, `service_role`, JWTs
(`eyJ…`), AWS keys (`AKIA…`), GitHub tokens (`ghp_` / `github_pat_`), PEM
headers, and `password` / `secret` / `api_key` / `token` assignments. No match on
any added line.

The only external URL introduced is the Stripe payment link. **A Stripe payment
link is not a secret** — it is a hosted checkout URL designed to be handed to
customers, and it confers no API access. It belongs in the source.

---

## Summary

| | #31 | #30 | #29 |
|---|---|---|---|
| Vercel checks (both projects) | green | green | green |
| Mergeable against `main` | clean | clean | clean |
| Secrets in diff | none | none | none |
| Blocking defect | — | — | **$199 vs #31** |
| Verdict | **MERGE** | **MERGE** | **FIX FIRST** |

One decision is yours and nobody should make it for you: #29 offers to remove
"first 20 only" from the banner as well. It is true today at zero sales and
nothing enforces the cap, so it is a commitment the code cannot keep. Your call.
