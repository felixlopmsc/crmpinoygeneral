/*
# Create get_active_policy_count() function

1. New Functions
  - `get_active_policy_count()` — returns a single integer count of active, non-expired, non-deleted policies.

2. Purpose
  - Provides a single canonical source of truth for "active policy count" across Dashboard, Policies page, and Reports page.
  - Filters: status = 'Active', expiration_date >= current_date, deleted_at IS NULL.

3. Security
  - Uses SECURITY INVOKER so RLS policies are respected for the calling user.
  - Marked STABLE (no side effects, same result within a single transaction).

4. Important Notes
  - All three pages (Dashboard, Policies, Reports) will call this function via supabase.rpc('get_active_policy_count') to guarantee identical numbers.
*/

CREATE OR REPLACE FUNCTION get_active_policy_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  SELECT count(*)::integer
  FROM policies
  WHERE status = 'Active'
    AND expiration_date >= current_date
    AND deleted_at IS NULL;
$$;
