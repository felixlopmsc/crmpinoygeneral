-- security_check.sql
--
-- Repeatable RLS/permissions audit for the Pinoy General CRM Supabase
-- project. Run after every deploy (Bolt, migration, manual change).
--
-- Contract: returns ZERO rows when the database is clean. Any row
-- returned names a concrete regression to fix before the deploy is
-- considered safe. Two known, accepted exceptions are documented
-- inline below (search "ACCEPTED EXCEPTION").
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/security_check.sql
--   -- or paste into the Supabase SQL editor / run via execute_sql.
-- A non-empty result = fail the deploy.

-- (a) Permissive write policies (USING(true) / WITH CHECK(true) for
--     INSERT/UPDATE/DELETE) granted to anon or authenticated, on any
--     table other than the three intended public-write tables.
--     SELECT policies with true are intentionally excluded (public
--     read-only reference data, e.g. rate tables), matching Supabase's
--     own rls_policy_always_true advisor semantics.
SELECT
    'a_permissive_write_policy' AS issue_type,
    p.tablename AS object_name,
    format('policy %I on %I.%I (%s) grants unrestricted %s to {%s}',
           p.policyname, p.schemaname, p.tablename, p.cmd, p.cmd,
           array_to_string(p.roles, ','))            AS detail
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND p.cmd IN ('INSERT', 'UPDATE', 'DELETE')
  AND (p.qual = 'true' OR p.with_check = 'true')
  AND (p.roles && ARRAY['anon', 'authenticated']::name[])
  AND NOT (
        p.cmd = 'INSERT'
        AND p.tablename IN ('quote_requests', 'quote_request_documents', 'contact_submissions')
      )

UNION ALL

-- (b) SECURITY DEFINER functions directly executable by anon or
--     authenticated. NOTE: public.is_staff() will always appear here -
--     it is a SECURITY DEFINER helper deliberately called from inside
--     dozens of RLS policies, so `authenticated` must retain EXECUTE
--     for those policies to evaluate at all. ACCEPTED EXCEPTION: treat
--     is_staff as the only allowed row for this issue_type; any other
--     function appearing here is a real regression.
SELECT
    'b_security_definer_executable' AS issue_type,
    p.proname AS object_name,
    format('SECURITY DEFINER function %I.%I() executable by {%s}',
           n.nspname, p.proname, array_to_string(grantees.roles, ','))  AS detail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
CROSS JOIN LATERAL (
    SELECT array_agg(DISTINCT r.rolname ORDER BY r.rolname) AS roles
    FROM aclexplode(p.proacl) a
    JOIN pg_roles r ON r.oid = a.grantee
    WHERE a.privilege_type = 'EXECUTE'
      AND r.rolname IN ('anon', 'authenticated')
) grantees
WHERE n.nspname = 'public'
  AND p.prosecdef = true
  AND grantees.roles IS NOT NULL

UNION ALL

-- (c) Public functions with no search_path pinned (proconfig IS NULL).
SELECT
    'c_null_search_path' AS issue_type,
    p.proname AS object_name,
    format('function %I.%I() has no search_path set', n.nspname, p.proname) AS detail
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proconfig IS NULL

UNION ALL

-- (d) RLS-enabled tables with zero policies (all access silently
--     denied to anon/authenticated - usually a sign a policy was
--     forgotten, not a deliberate deny-all).
SELECT
    'd_rls_enabled_no_policy' AS issue_type,
    c.relname AS object_name,
    format('table %I.%I has RLS enabled but zero policies', n.nspname, c.relname) AS detail
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = true
  AND NOT EXISTS (
        SELECT 1 FROM pg_policies pp
        WHERE pp.schemaname = n.nspname AND pp.tablename = c.relname
      )

UNION ALL

-- (e) Tables in the public schema with RLS disabled entirely.
SELECT
    'e_rls_disabled' AS issue_type,
    c.relname AS object_name,
    format('table %I.%I has row level security disabled', n.nspname, c.relname) AS detail
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relrowsecurity = false

ORDER BY issue_type, object_name;
