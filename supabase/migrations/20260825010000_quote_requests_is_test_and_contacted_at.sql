-- AFFECTS BOTH APPS: the client portal (pinoy-insurance-portal) writes
-- quote_requests; this CRM reads and works them. Shared Supabase project
-- fetiakfllzxwibqzfedh.
--
-- Three things, all so the DR-001 gate can be measured on real requests:
--
--   1. is_test      -- flag internal submissions instead of deleting them.
--   2. contacted_at -- when a request was FIRST acted on. Did not exist:
--                      quote_requests had only created_at / updated_at /
--                      deleted_at, and updated_at moves on any edit, so
--                      "median first response" was unmeasurable.
--   3. A convention  -- internal submissions carry a recognisable email marker
--                      and are flagged automatically, so this cannot silently
--                      recur.
--
-- ROLLBACK:
--   drop trigger if exists trg_quote_request_contacted_at on public.quote_requests;
--   drop trigger if exists trg_mark_test_quote_request   on public.quote_requests;
--   drop function if exists public.set_quote_request_contacted_at();
--   drop function if exists public.mark_test_quote_request();
--   drop index if exists public.quote_requests_staff_inbox_idx;
--   alter table public.quote_requests drop column if exists contacted_at;
--   alter table public.quote_requests drop column if exists is_test;
--   -- Cosindad's status was 'New' before this migration:
--   -- update public.quote_requests set status = 'New'
--   --  where id = 'b56729e4-fb03-4317-a7f2-1cf0c35ed105';

-- ── 1. columns ───────────────────────────────────────────────────────────────

alter table public.quote_requests
  add column if not exists is_test      boolean not null default false,
  add column if not exists contacted_at timestamptz;

comment on column public.quote_requests.is_test is
  'Internal/test submission. Flagged, never deleted, so history survives. Every staff-facing count, the quote-request inbox and any gate instrumentation must exclude is_test = true.';

comment on column public.quote_requests.contacted_at is
  'When this request was first acted on -- set automatically on the first status transition. Rows predating 2026-08-25 carry the earliest KNOWN touch, or null where none is known.';

-- ── 2. flag the nine confirmed internal submissions ──────────────────────────
-- Identified by inspection and confirmed by Felix on 2026-08-25. Listed by id
-- rather than matched by pattern so the set is exact and auditable.
--
--   4x felix@mscinnovations.com, 1x felixlopmsc@gmail.com,
--   test@testuser.com, audittest@pinoygeneralinsurance.com,
--   a "Felix Lopez" with a mashed email, and "maria santos" (Felix's test,
--   submitted with the agency's own phone number).

update public.quote_requests
   set is_test = true
 where id in (
   '230e60b0-41af-4aa4-a0ba-ab139058f668',
   '1f3785cf-86d8-41d1-b97a-541c27c83c0e',
   '43ec0625-9432-4778-a01f-d96aca724a20',
   'c4d20bec-9a2f-47dc-b672-c72c717bad44',
   '22794bf2-2682-4611-9e3d-3860c6aa8641',
   '3bdf0217-6e08-47b7-acfa-4d0a612e3e54',
   '2b078ecd-f775-4736-8c8a-7be09db75a93',
   '7edb449c-aa3c-4e76-a3be-5fef8764a77e',
   'b966dc49-8858-4e6c-9e6d-df17fba95516'
 );

-- ── 3. the one real request in the table ─────────────────────────────────────
-- Joseph Cosindad, submitted 2026-08-21, policy bound 2026-08-24. He is NOT
-- test data: he is the only row with a lead in public.leads. Marked Won, and
-- given the bind date as his first-touch timestamp -- the earliest touch we
-- can evidence, so the response figure it produces is conservative rather
-- than flattering. The policy record itself is keyed in by staff separately.

update public.quote_requests
   set status       = 'Won',
       contacted_at = timestamptz '2026-08-24 00:00:00+00'
 where id = 'b56729e4-fb03-4317-a7f2-1cf0c35ed105'
   and status = 'New';

-- ── 4. the convention, enforced ──────────────────────────────────────────────
-- Internal submissions use a +test sub-address (felix+test@..., any suffix).
-- is_test is DERIVED on insert, never taken from the client: the portal's
-- insert policy is WITH CHECK (true) for anon, so a client-supplied flag could
-- otherwise be used to hide a genuine request from the inbox.

create or replace function public.mark_test_quote_request()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.is_test := new.email is not null and new.email ~* '\+test[a-z0-9._-]*@';
  return new;
end;
$$;

drop trigger if exists trg_mark_test_quote_request on public.quote_requests;
create trigger trg_mark_test_quote_request
  before insert on public.quote_requests
  for each row execute function public.mark_test_quote_request();

-- ── 5. first-response instrumentation ────────────────────────────────────────
-- Stamps the first time status moves at all, and never overwrites. A request
-- taken straight from New to Won still records that first touch.

create or replace function public.set_quote_request_contacted_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.contacted_at is null then
    new.contacted_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quote_request_contacted_at on public.quote_requests;
create trigger trg_quote_request_contacted_at
  before update on public.quote_requests
  for each row execute function public.set_quote_request_contacted_at();

-- ── 6. the shape the staff inbox actually queries ────────────────────────────

create index if not exists quote_requests_staff_inbox_idx
  on public.quote_requests (status, created_at desc)
  where is_test = false and deleted_at is null;
