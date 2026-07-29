# Agila demo sandbox

The public "Try the live demo" experience runs against a **separate Supabase
project** so a prospect clicking around can never reach real client data.

| | Production | Demo sandbox |
|---|---|---|
| Project ref | `fetiakfllzxwibqzfedh` | `wdynqlrbirvartitpwcn` |
| Contains | real client PII | generated sample data only |
| Writes | normal RLS by role | open to the demo user, reset hourly |

## How the app picks a project

`lib/supabase.ts` reads a `pgi-demo` flag from `localStorage` at module init and
points the Supabase singleton at the demo project when it is set. Because the
swap happens in the client factory, **all existing `supabase.from(...)` calls
work unchanged** — no per-page changes were needed.

`/demo` (`app/demo/page.tsx`) is the entry point:

1. sets the flag and hard-reloads (so the singleton re-initialises), then
2. signs into the seeded demo account and forwards to `/dashboard`.

`components/layout/demo-banner.tsx` renders the persistent sandbox notice and an
"Exit demo" button that signs out, clears the flag and returns to `/`.

## Files here

- `04_reset.sql` — snapshot schema + `demo_reset()` + hourly `pg_cron` job

This is **not** in `supabase/migrations/` on purpose: that directory targets the
production project, and this must never run against it.

The sandbox's schema, functions/policies and seed data were applied directly to
the demo project rather than checked in here. They are recoverable from the
project itself if they ever need to be replayed:

```sql
-- applied migrations, newest last
select version, name, statements from supabase_migrations.schema_migrations
order by version;
```

Relevant migration names on the demo project:
`demo_replicate_crm_schema`, `demo_functions_and_readonly_rls`,
`demo_seed_snapshot_and_reset`, `demo_cleanup_readonly_leftovers`.
The seed itself is reproducible from the generator query stored in
`demo_seed.*` (the snapshot tables *are* the seed).

## Resetting

`public.demo_reset()` restores every table from the `demo_seed` snapshot schema.
It runs hourly via `pg_cron` (job `demo-hourly-reset`) and can be invoked
manually from the SQL editor:

```sql
select public.demo_reset();
```

The demo login (`users`, `user_settings`, `onboarding_progress`) is deliberately
left out of the reset so the account survives.

## Demo credentials

Seeded staff account (`Admin`, so every nav item is visible):

```
demo@pinoygeneralcrm.com / demo-crm-2026
```

Visitors never type these — `/demo` signs in for them.
