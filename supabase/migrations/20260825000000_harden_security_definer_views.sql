-- AFFECTS BOTH APPS: the client portal (pinoy-insurance-portal) and this CRM
-- share Supabase project fetiakfllzxwibqzfedh.
--
-- public.expected_slots and public.run_health are automation-monitoring views
-- owned by postgres. Both were granted to anon AND authenticated with full
-- privileges, and both ran with the view owner's rights, so anyone holding the
-- public anon key could read internal automation run health through PostgREST.
-- Supabase advisor lint 0010 flagged both at ERROR.
--
-- Neither view is referenced anywhere in this repo, in the portal repo, or by
-- any other database object -- the only dependency is run_health -> expected_slots.
-- The only legitimate readers are postgres (superuser) and service_role, which
-- has BYPASSRLS, so security_invoker does not change anything for them.
-- dreamlit_app keeps its own read grant; this migration does not touch it.
--
-- Note the underlying automation_runs has RLS enabled with zero policies, so
-- under security_invoker a non-superuser would see nothing anyway. The revoke
-- is what removes the exposure; the invoker switch is what clears the lint.
--
-- Applied to production 2026-08-25. Both ERROR lints confirmed cleared after.
--
-- ROLLBACK:
--   alter view public.expected_slots set (security_invoker = off);
--   alter view public.run_health     set (security_invoker = off);
--   grant all on public.expected_slots to anon, authenticated;
--   grant all on public.run_health     to anon, authenticated;

alter view public.expected_slots set (security_invoker = on);
alter view public.run_health     set (security_invoker = on);

revoke all on public.expected_slots from anon, authenticated;
revoke all on public.run_health     from anon, authenticated;
