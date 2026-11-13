# Build log — crmpinoygeneral

Append-only record of what was changed, what was verified, and **how** it was
verified. One entry per merge or deploy. A claim with no check beside it is not
an entry.

Rule this file exists to serve, from CLAUDE.md: *verify after write.* Five bugs
this year were "reported success, nothing happened". An entry here is the
evidence, not the intention.

---

## 2026-11-13 — Review of #29, #30, #31 (no merges)

**Changed:** nothing in the product. Added `PR_Review_Verdicts.md` on
`review/pr-verdicts-nov12` (PR #35).

**Verdicts:** #31 MERGE · #30 MERGE · #29 FIX FIRST. Order #31 → #30 → #29.

| Claim | How it was checked | Result |
|---|---|---|
| #31 leaves Solo/Agency/Multi-Office fees intact | read the resulting tree, not the diff's silence | `$199`/`$499`/`$999` at lines 134/151/169 **byte-identical to `main`**; still rendered by the untouched `+ {p.setup}` |
| #31 amends the PRODUCT.md paragraph | read both versions | amended — setup fees survive as a concept, founding exemption added |
| #31 updates the pricing footnote | diffed `main` vs branch | updated: "Founding agencies pay no setup fee. On other tiers the setup fee is billed once at onboarding, not monthly." |
| #29's CTA target | quoted the literal from the diff | `https://buy.stripe.com/9B614o2OH89w4pl33YcAo00` — real, **live mode** (no `test_` path prefix), replaces `#book-demo` |
| #29 hardcodes a seat count | grepped the branch tree | **no**. `first 20 only` is byte-identical to `main` — pre-existing, and a cap not a tally |
| #29 vs #31 conflict | **real merge commits** in throwaway worktrees, both orders | **clean both ways, no rebase.** All three touch `app/page.tsx`; none touch the same lines. #30 is footer-only |
| #30 required coverage | read the rendered sections | all five present: Supabase US region, retention, CCPA, 5-row subprocessor table, contact address |
| #30's `us-west-2` claim | queried the live project | **true** — `fetiakfllzxwibqzfedh` reports `region: us-west-2` |
| #30 labelled boilerplate | read title + body | yes, in the title **and** the first line |
| Secrets in any diff | grepped all 605 added/removed lines for `sk_live`/`sk_test`/`pk_live`/`whsec_`/`service_role`/JWT/`AKIA`/`ghp_`/PEM/assignments | **none.** Only external URL is the Stripe payment link, which is public by design |
| CI | Vercel commit statuses | #29, #30, #31 all **green on both** Vercel projects |

**Blocking defect found (#29):** its Stripe link was built on pricing #31
abolishes. #29's description and its code comment both say "+ $199 one-time
setup"; #31 removes that fee. Verified by merging both and reading the result —
the page says *"No setup fee — founding agencies onboard free"* above a button
opening a checkout created to charge $199.

**Method correction worth keeping:** the first pass grepped #30 for the words
"retention", "CCPA" and "subprocessor" and found **zero** — which would have
read as missing sections. All three exist under different headings ("How long we
keep it", "California privacy rights"). Grepping for the word instead of the
concept produces a false negative.

---

## Pending — fill in immediately after each step

These are not done. Each line names the check that closes it.

- [ ] **#31 merged.** Check: `main`'s `app/page.tsx` shows no setup-fee line in
      the `$49` founding block, and the footnote carries the exemption.
- [ ] **#30 merged.** Check: `/terms` and `/privacy` return 200 on the live site
      and the footer links to both plus the contact address.
- [ ] **Stripe link audited** (Felix — no Stripe access from a session). Check:
      link `9B614o2OH89w4pl33YcAo00` in the Stripe dashboard carries **one
      recurring $49 price and no one-time line item**. If it does, #29's only
      remaining defect is stale text.
- [ ] **#29's stale text fixed.** Check: the `FOUNDING_SEAT_CHECKOUT_URL` doc
      comment no longer says "+ $199 one-time setup".
- [ ] **#29 merged and deployed.** Check: grep the live bundle for
      `buy.stripe.com/9B614o2OH89w4pl33YcAo00` and record the bundle filename.
- [ ] **Button clicked on the live site** (Felix). Check: it opens the $49
      recurring checkout, with no setup fee shown. This is the verification that
      counts — a deployed bundle containing the URL proves the link shipped, not
      that the checkout is right.
