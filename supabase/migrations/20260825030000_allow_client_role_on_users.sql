-- AFFECTS BOTH APPS: shared Supabase project fetiakfllzxwibqzfedh. This is
-- what currently stops ANY new signup, in either app, from completing.
--
-- handle_new_user() fires AFTER INSERT on auth.users and inserts into
-- public.users with role 'Client'. users_role_check permits only
-- 'Admin' | 'Agent' | 'Viewer'. The trigger raises, the transaction aborts,
-- and the auth.users row is never created. Signup does not "produce an empty
-- portal" -- it fails outright.
--
-- Evidence it has been broken since the trigger's role literal changed:
-- public.client_profiles holds exactly one row, and that account already had
-- a users row as Admin, so ON CONFLICT (id) DO NOTHING skipped the illegal
-- insert. Nobody else has ever been able to finish signing up.
--
-- The original trigger (20260306001158) inserted 'Admin', which is how four
-- of the five staff rows exist with a users_row/auth_user timestamp delta of
-- zero. Changing it to 'Client' was correct -- self-serve admin was a real
-- problem -- but the constraint was never widened to match.
--
-- WHY NOT the cleaner design (portal signups create no users row at all):
-- staff onboarding depends on this trigger branch. The CRM's /login page has
-- a signup view calling supabase.auth.signUp(), and NO code anywhere in
-- either repo inserts into public.users. The trigger is the only thing that
-- creates a staff row. Remove the insert and staff can never onboard again.
--
-- Widening the constraint is additive and reversible. See CLAUDE.md.
--
-- ROLLBACK (only valid while no 'Client' rows exist -- check first, or they
-- will violate the restored constraint):
--   -- select count(*) from public.users where role = 'Client';
--   alter table public.users drop constraint users_role_check;
--   alter table public.users add constraint users_role_check
--     check (role = any (array['Admin','Agent','Viewer']));

alter table public.users drop constraint if exists users_role_check;

alter table public.users add constraint users_role_check
  check (role = any (array['Admin', 'Agent', 'Viewer', 'Client']));

comment on column public.users.role is
  'Admin/Agent are staff -- is_staff() matches exactly these two. Viewer is read-only staff. Client is a portal signup: it exists only because handle_new_user() creates a row for every auth user, and it grants nothing. A staff member who signs up on the CRM also lands as Client and must be promoted by an Admin, which is deliberate: the trigger used to insert Admin, so anyone who signed up became one.';
