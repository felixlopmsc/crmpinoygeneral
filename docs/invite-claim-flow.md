# Client invite / claim flow

**Status:** spec, implemented in the same PR.
**Touches:** shared Supabase project `fetiakfllzxwibqzfedh` — this CRM *and* the
client portal (`felixlopmsc/pinoy-insurance-portal`).

## The problem

Signup creates an auth user and a `client_profiles` row. **Nothing has ever set
`client_profiles.client_id`.** Verified 2026-08-25:

- `on_auth_user_created` → `handle_new_user()` inserts into `public.users`
  (role `'Client'`). It does not touch `client_profiles`.
- The portal's `signup()` and `ensureProfile()` both insert `client_profiles`
  with id / email / name / phone, and no `client_id`.
- Across the portal's `src/`, `client_id` is only ever read.
- `fetchUserWithProfile` returns `policies: []` when `client_id` is null.

A real client signs up and gets a permanently empty portal, with no signal that
anything is wrong.

## The bigger problem found on the way

`client_profiles_update_own` is `WITH CHECK (auth.uid() = id)` — it constrains
*which row* you may update, not *which columns*. `authenticated` holds
table-level `UPDATE`. And three policies resolve access through that column:

```
portal_clients_select_own_policies   client_id IN (select client_id from client_profiles where id = auth.uid())
portal_clients_select_own_documents  (same shape)
portal_clients_select_own_client     (same shape)
```

So **any authenticated portal user could set their own `client_id` to any
`clients.id` and immediately read that client's policies and documents.**

Exposure today is effectively nil — one `client_profiles` row exists, Felix's —
but an invite flow layered on top of a writable `client_id` would be
decorative. Closing this is part of the same change.

## Design

Smallest thing that is actually safe.

### 1. `client_id` becomes unwritable by clients

```sql
revoke update on public.client_profiles from authenticated;
grant  update (email, first_name, last_name, phone, referral_code, updated_at)
       on public.client_profiles to authenticated;
```

Column privileges rather than a trigger: declarative, and it cannot be bypassed
by a future policy edit. `id`, `created_at` and `client_id` become unwritable
through PostgREST. Both ways of setting `client_id` now go through
`SECURITY DEFINER` functions that decide the value themselves.

### 2. `client_invites` — single-use, expiring, tied to one client

| column | note |
|---|---|
| `client_id` | the client this invite binds to |
| `token_hash` | **sha256 of the token. The raw token is never stored.** |
| `email` | who it was sent to, for audit |
| `expires_at` | default 14 days |
| `redeemed_at` / `redeemed_by` | single-use |
| `created_by` | staff member, for audit |

Staff call `create_client_invite(client_id, email, days)`, which returns the raw
token **once**. It is stored only as a hash, so a database read cannot recover a
live invite — the same reason password hashes exist.

RLS: `is_staff()` only. **Deliberately no own-rows policy for clients** —
a client has no legitimate reason to read invite rows, and being able to would
turn the table into an enumeration surface.

### 3. `redeem_client_invite(p_token)` — the bind

`SECURITY DEFINER`, `search_path` pinned. Requires `auth.uid()`.

Takes **only the token**. The `client_id` comes off the invite row; it is never
accepted from the caller. Rejects expired, already-redeemed, and unknown tokens
with the same generic message, so the function cannot be used as an oracle for
which tokens exist.

On success: sets `client_profiles.client_id`, stamps `redeemed_at` /
`redeemed_by`, and resolves any pending link request for that profile.

### 4. `profile_link_requests` — the staff queue

A signup with no invite is not an error and must not be a silent empty
dashboard. An `AFTER INSERT` trigger on `client_profiles` files a row here when
`client_id` is null.

RLS follows both existing patterns: `is_staff()` for staff (full), and
own-rows (`profile_id = auth.uid()`) `SELECT` for the client, so the portal can
show its pending state without a second round trip.

Staff resolve it with `link_client_profile(profile_id, client_id)` —
`SECURITY DEFINER`, `is_staff()`-guarded, which is also the only way staff can
write `client_id` now that the column is revoked.

### 5. Portal

- `/claim?token=…` stores the token in `sessionStorage` and routes to signup, or
  login if the visitor already has an account.
- On the next authenticated session, the portal calls `redeem_client_invite`
  once and clears the stored token.
- When `client_id` is null, the dashboard shows an honest pending state —
  *"We're linking your account — you'll get an email when your policies
  appear."* — instead of the empty-glovebox states.

## Considered and rejected

**Self-serve matching by policy number.** Let a client type a policy number and
bind themselves to whatever client owns it. Rejected for v1: policy numbers are
guessable and semi-public (they appear on cards, correspondence and carrier
paperwork), so it is an enumeration and PII-disclosure surface — a wrong guess
does not fail safe, it binds you to a stranger's book. An invite is a
capability the agency hands out deliberately; a policy number is not.

**Matching on email equality with `clients.email`.** Tempting and nearly free,
but it silently trusts an email the client controls at signup and the CRM's
email data is not clean enough to bet PII on. It also fails open: a typo binds
nobody, a collision binds the wrong person. Staff review is the v1 answer.

**A trigger guarding `client_id` instead of column privileges.** Works, but
needs a GUC or `current_user` escape hatch for the definer functions, which is
easy to get subtly wrong. Column privileges say the same thing declaratively.

## Rollback

In the migration header. Additive throughout — two new tables, three functions,
one trigger, one grant change. Nothing is dropped or rewritten, so rollback is
`drop` plus restoring the table-level `UPDATE` grant.
